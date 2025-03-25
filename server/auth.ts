import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage as memStorage } from "./storage";
import { pgStorage } from "./pg-storage";
import { User as SelectUser } from "@shared/schema";
import { z } from "zod";
import { emailService } from "./email";

// Use PostgreSQL storage if DATABASE_URL is set, otherwise use in-memory storage
const storage = process.env.DATABASE_URL ? pgStorage : memStorage;

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Use a more secure session secret strategy
  // In production without env var, generate a random secret (will change on restart, forcing re-login)
  // In development without env var, use a consistent dev secret
  const sessionSecret = process.env.SESSION_SECRET || 
    (process.env.NODE_ENV === 'production' 
      ? randomBytes(32).toString('hex')
      : 'quran-circle-dev-secret');
      
  console.log(`Session security: Using ${process.env.SESSION_SECRET ? 'environment' : 
    (process.env.NODE_ENV === 'production' ? 'random' : 'development')} secret`);
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    name: '__Host-sid', // More secure cookie name
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: true, // Always require HTTPS
      httpOnly: true,
      sameSite: 'strict',
      path: '/'
    },
    rolling: true // Extend session with activity
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      // Check if the input is an email by looking for @ symbol
      const isEmail = username.includes('@');
      
      // Get user by username or email based on the input
      const user = isEmail 
        ? await storage.getUserByEmail(username)
        : await storage.getUserByUsername(username);
      
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    // Check if username already exists
    const existingUserByUsername = await storage.getUserByUsername(req.body.username);
    if (existingUserByUsername) {
      return res.status(400).send("Username already exists");
    }
    
    // Check if email already exists
    const existingUserByEmail = await storage.getUserByEmail(req.body.email);
    if (existingUserByEmail) {
      return res.status(400).send("Email address already registered");
    }

    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Schema for forgot password request
  const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
  });

  // Schema for password reset request
  const resetPasswordSchema = z.object({
    token: z.string(),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
  });

  // Generate a random token for password reset
  function generateResetToken(): string {
    return randomBytes(32).toString('hex');
  }

  // Route to handle forgot password requests
  app.post("/api/forgot-password", async (req: Request, res: Response) => {
    try {
      // Validate input
      const { email } = forgotPasswordSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal that the email doesn't exist for security
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }
      
      // Generate token and set expiry (1 hour from now)
      const resetToken = generateResetToken();
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      // Save token to user record
      await storage.setPasswordResetToken(user.id, resetToken, tokenExpiry);
      
      // Create reset URL
      const baseUrl = process.env.BASE_URL || `http://${req.headers.host}`;
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
      
      // Send email
      try {
        await emailService.sendPasswordResetEmail(user, resetToken, resetUrl);
        console.log('Password reset email sent successfully or handled by fallback system');
      } catch (error) {
        console.error('Failed to send password reset email (both primary and fallback failed):', error);
        return res.status(500).json({ 
          error: "Failed to send password reset email", 
          message: "We're experiencing issues with our email service. Please try again later or contact support." 
        });
      }
      
      // Return success message (same message whether user exists or not for security)
      return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error('Forgot password error:', error);
      return res.status(500).json({ error: "An error occurred processing your request" });
    }
  });
  
  // Route to check if a reset token is valid (used by frontend before showing reset form)
  app.get("/api/reset-password/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      // Find user with this token that hasn't expired
      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired password reset link" });
      }
      
      // Token is valid
      return res.json({ valid: true });
    } catch (error) {
      console.error('Reset token check error:', error);
      return res.status(500).json({ error: "An error occurred processing your request" });
    }
  });
  
  // Route to actually reset the password
  app.post("/api/reset-password", async (req: Request, res: Response) => {
    try {
      // Validate input
      const { token, newPassword } = resetPasswordSchema.parse(req.body);
      
      // Find user with this token that hasn't expired
      const user = await storage.getUserByResetToken(token);
      
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired password reset link" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update user's password and clear the reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      });
      
      return res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error('Password reset error:', error);
      return res.status(500).json({ error: "An error occurred processing your request" });
    }
  });
}
