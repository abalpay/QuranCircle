import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import * as dotenv from "dotenv";
import { runMigrations } from "./db";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import csurf from "csurf";
import { randomBytes } from "crypto";
import { initializeWebSockets } from "./websocket";

// Load environment variables from .env file
dotenv.config();

console.log("Environment variables loaded");
if (process.env.MAILJET_API_KEY) {
  console.log("Mailjet API key is configured");
} else {
  console.log("Mailjet API key is not set");
}

// Check if DATABASE_URL is set
if (process.env.DATABASE_URL) {
  console.log("PostgreSQL database connection configured");
} else {
  console.warn("WARNING: PostgreSQL database connection not configured. Using in-memory storage.");
}

const app = express();
// Security enhancement: disable X-Powered-By header
app.disable('x-powered-by');

// Add compression for responses
app.use(compression());

// Apply global rate limiting - increased to handle high-traffic events
const globalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes window
  max: 500, // 500 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests, please try again later.",
  skipSuccessfulRequests: true // Skip successful requests to allow more reads
});

// Enable trust proxy to get correct client IP behind proxies
app.set('trust proxy', true);

// Registration rate limit
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registration attempts per hour
  message: "Too many registration attempts, please try again later.",
  skipSuccessfulRequests: true
});

app.use("/api/register", registerLimiter);

// Apply stricter rate limiting to authentication routes - 5 attempts per hour
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, 
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: "Too many authentication attempts, please try again later."
});

// Apply global rate limiting to all routes
app.use(globalLimiter);

// Apply stricter limiting to authentication routes
app.use("/api/login", authLimiter);
app.use("/api/forgot-password", authLimiter);
app.use("/api/reset-password", authLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Add basic security headers
app.use((req, res, next) => {
  // Helps prevent XSS attacks
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Prevents MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevents clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Content Security Policy to prevent XSS and other injection attacks
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;");
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Run database migrations if PostgreSQL is configured
    if (process.env.DATABASE_URL) {
      await runMigrations();
    }
    
    // Setup CSRF protection - must be after cookie-parser and before routes
    const csrfProtection = csurf({ cookie: { 
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    }});
    
    // CSRF token endpoint
    app.get("/api/csrf-token", csrfProtection, (req, res) => {
      res.json({ csrfToken: req.csrfToken() });
    });
    
    // Apply CSRF protection to state-changing routes
    app.use("/api/events", csrfProtection);
    app.use("/api/juz", csrfProtection);
    app.use("/api/khatms", csrfProtection);
    
    const server = await registerRoutes(app);
    
    // Initialize WebSocket server for real-time updates
    initializeWebSockets(server);

    app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
      // Handle CSRF errors specially
      if (err.code === 'EBADCSRFTOKEN') {
        // Set a header that client code can check to clear the token
        res.setHeader('X-CSRF-Invalid', 'true');
        return res.status(403).json({ 
          message: "Invalid or missing CSRF token", 
          error: "security_error",
          detail: "Your form submission could not be processed. Please refresh the page and try again."
        });
      }
      
      // For other errors
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      // Log server errors but not client errors
      if (status >= 500) {
        console.error(`Server error: ${err.stack || err}`);
      }

      res.status(status).json({ message });
      
      // Don't throw in production - this would crash the server
      if (process.env.NODE_ENV !== 'production') {
        throw err;
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start the server:', error);
    process.exit(1);
  }
})();
