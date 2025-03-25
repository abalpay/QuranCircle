import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import * as dotenv from "dotenv";
import { runMigrations } from "./db";

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
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add basic security headers
app.use((req, res, next) => {
  // Helps prevent XSS attacks
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Prevents MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevents clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
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
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
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
