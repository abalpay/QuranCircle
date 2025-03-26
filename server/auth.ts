import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Express, Request, Response } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage as memStorage } from "./storage";
import { pgStorage } from "./pg-storage";
import { User as SelectUser, insertGoogleUserSchema, insertBookmarkSchema } from "@shared/schema";
import { z } from "zod";
import { emailService } from "./email";
import { cache } from "./cache";

// Use PostgreSQL storage if DATABASE_URL is set, otherwise use in-memory storage
const storage = process.env.DATABASE_URL ? pgStorage : memStorage;

// Extend session type to include returnTo
declare module 'express-session' {
  interface SessionData {
    returnTo?: string;
  }
}

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
    name: 'sid',
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      // Set secure to true only if using HTTPS and not behind a proxy that doesn't properly set X-Forwarded-Proto
      secure: process.env.NODE_ENV === 'production' && !process.env.REPLIT_ENVIRONMENT,
      httpOnly: true,
      sameSite: process.env.REPLIT_ENVIRONMENT ? 'none' : 'lax', // Use 'none' for Replit environment
      path: '/'
    },
    rolling: true // Extend session with activity
  };
  
  console.log(`Session cookie settings: secure=${process.env.NODE_ENV === 'production' && !process.env.REPLIT_ENVIRONMENT}, sameSite=${process.env.REPLIT_ENVIRONMENT ? 'none' : 'lax'}`)

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local strategy for username/password login
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
  
  // Google OAuth strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('Google OAuth initialization starting...');
    
    // Define allowed callback domains for Google OAuth
    // These should match exactly what's configured in the Google Cloud Console
    const allowedCallbackDomains = [
      'https://qurancircle.io',  // Production with Cloudflare
      'https://www.qurancircle.io', // With www subdomain
      'https://quran-circle-abalpay94.replit.app', // Correct Replit domain
      'https://workspace.abalpay94.replit.app', // Current Replit domain based on REPL_SLUG and REPL_OWNER
      'https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.replit.app', // Dynamic Replit domain
      'http://localhost:5000'    // Local development
    ];
    
    // Log allowed domains for debugging
    console.log('Allowed Google OAuth callback domains:', allowedCallbackDomains);
    
    // Default callback URL (will be dynamically overridden by proxy callback)
    // This is the URL that Google will call back to after authentication 
    // Make sure it's registered in Google Cloud Console
    let defaultCallbackURL = 'http://localhost:5000/auth/google/callback';
    
    if (process.env.NODE_ENV === 'production') {
      if (process.env.BASE_URL) {
        defaultCallbackURL = `${process.env.BASE_URL}/auth/google/callback`;
      } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        // Dynamic Replit URL based on environment variables
        defaultCallbackURL = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.app/auth/google/callback`;
      } else {
        // Fallback to the static URL
        defaultCallbackURL = 'https://quran-circle-abalpay94.replit.app/auth/google/callback';
      }
    }
    
    console.log('Default Google OAuth callback URL:', defaultCallbackURL);
    
    // Use a proxy callback that dynamically determines the correct callback URL
    const proxyCallback = (req: any, accessToken: string, refreshToken: string, profile: any, done: any) => {
      // Get the request origin or referer to determine which domain is being used
      const origin = req.headers.origin || req.headers.referer || '';
      console.log(`Google OAuth request from origin: ${origin}`);
      
      // Find matching domain from our allowed list
      let matchingDomain = allowedCallbackDomains.find(domain => origin.startsWith(domain));
      
      if (!matchingDomain && process.env.NODE_ENV === 'production') {
        console.log('Could not determine exact origin domain, defaulting to production URL');
        if (process.env.BASE_URL) {
          matchingDomain = process.env.BASE_URL;
        } else if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
          matchingDomain = `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.app`;
        } else {
          matchingDomain = 'https://quran-circle-abalpay94.replit.app';
        }
      } else if (!matchingDomain) {
        console.log('Could not determine exact origin domain, defaulting to localhost');
        matchingDomain = 'http://localhost:5000';
      }
      
      // Log detected domain for debugging
      console.log(`Using domain for authentication: ${matchingDomain}`);
      
      console.log(`Using Google OAuth callback domain: ${matchingDomain}`);
      
      // Call the actual strategy callback
      return googleStrategyCallback(accessToken, refreshToken, profile, done);
    };
    
    // The actual Google strategy callback function
    const googleStrategyCallback = async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        console.log(`Google OAuth profile received: ${profile.id}`);
        const email = profile.emails?.[0]?.value;
          
        if (!email) {
          console.error('No email provided from Google');
          return done(new Error('No email provided from Google'));
        }
        
        console.log(`Google authentication for email: ${email}`);
        
        // Check if user already exists
        let user = await storage.getUserByEmail(email);
        
        // If user exists but was not created with Google, don't proceed
        if (user && user.providerType !== 'google') {
          console.log(`User exists with different provider: ${user.providerType}`);
          return done(null, false, { message: 'Email already registered with a different login method' });
        }
        
        // If user doesn't exist, create a new one
        if (!user) {
          console.log(`Creating new user for Google authentication: ${email}`);
          // Create a username based on their email or Google ID
          const defaultUsername = email.split('@')[0];
          
          // Check if username already exists
          const existingUserByUsername = await storage.getUserByUsername(defaultUsername);
          
          // If username exists, append a random string
          const username = existingUserByUsername 
            ? `${defaultUsername}-${randomBytes(3).toString('hex')}`
            : defaultUsername;
          
          console.log(`Generated username: ${username}`);
            
          const newUser = await storage.createUser(insertGoogleUserSchema.parse({
            username: username,
            email: email,
            providerType: 'google',
            providerId: profile.id
          }));
          
          console.log(`New user created successfully with ID: ${newUser.id}`);
          return done(null, newUser);
        }
        
        // User exists and was created with Google
        console.log(`Existing Google user found: ${user.username} (ID: ${user.id})`);
        return done(null, user);
      } catch (error) {
        console.error('Error in Google authentication:', error);
        return done(error as Error);
      }
    }
      
    passport.use(
      new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: defaultCallbackURL,
        passReqToCallback: true // Pass request to callback
      } as any, // Type assertion needed because of passReqToCallback
      proxyCallback as any)
    );
  } else {
    console.log('Google OAuth not configured. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required.');
  }

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

  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    // Check if the request includes a returnTo parameter with an event ID for auto-bookmarking
    try {
      const { returnTo } = req.body;
      
      if (returnTo && returnTo.includes('/circle/') && req.isAuthenticated() && req.user) {
        const parts = returnTo.split('/');
        const eventIdIndex = parts.indexOf('circle') + 1;
        
        if (eventIdIndex < parts.length) {
          const eventId = parseInt(parts[eventIdIndex]);
          
          if (!isNaN(eventId)) {
            // Check if the event exists
            const event = await storage.getEvent(eventId);
            
            if (event) {
              // Check if the bookmark already exists
              const existingBookmark = await storage.getBookmark(req.user.id, eventId);
              
              if (!existingBookmark) {
                // Auto-bookmark the event
                console.log(`Auto-bookmarking event ${eventId} for user ${req.user.id} after login`);
                await storage.createBookmark(insertBookmarkSchema.parse({
                  userId: req.user.id,
                  eventId: eventId
                }));
                
                // Clear any cached data for this event and user
                cache.delete(`event:${eventId}:user:${req.user.id}`);
                cache.delete(`events:user:${req.user.id}`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error auto-bookmarking event after login:', error);
      // Don't block the response if bookmarking fails
    }
    
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
  
  // Google OAuth routes
  app.get('/auth/google', (req, res, next) => {
    // Check if Google strategy is available before attempting to authenticate
    // Use any type assertion to access internal passport property
    const passportAny = passport as any;
    if (!passportAny._strategies['google']) {
      console.error('Google authentication strategy not available');
      return res.redirect('/?googleAuthFailed=true&reason=strategy_not_available');
    }
    
    passport.authenticate('google', { 
      scope: ['profile', 'email'],
      prompt: 'select_account' // Always prompt the user to select an account
    })(req, res, next);
  });
  
  app.get('/auth/google/callback', (req, res, next) => {
    // Check if Google strategy is available before attempting to authenticate
    const passportAny = passport as any;
    if (!passportAny._strategies['google']) {
      console.error('Google authentication strategy not available on callback');
      return res.redirect('/?googleAuthFailed=true&reason=strategy_not_available_callback');
    }
    
    // Log the callback
    console.log('Google OAuth callback received');
    
    passport.authenticate('google', { 
      failureRedirect: '/?googleAuthFailed=true',
      session: true
    })(req, res, next);
  },
    async (req, res) => {
      // Log successful authentication
      console.log('Google OAuth authentication successful');
      
      // Check if there's a return to URL
      const returnTo = req.session.returnTo || '/';
      delete req.session.returnTo;
      
      // Log the return URL
      console.log(`Redirecting after Google auth to: ${returnTo}`);
      
      // Auto-bookmark if returning to a circle page
      try {
        if (returnTo.includes('/circle/') && req.isAuthenticated() && req.user) {
          const parts = returnTo.split('/');
          const eventIdIndex = parts.indexOf('circle') + 1;
          
          if (eventIdIndex < parts.length) {
            const eventId = parseInt(parts[eventIdIndex]);
            
            if (!isNaN(eventId)) {
              // Check if the event exists
              const event = await storage.getEvent(eventId);
              
              if (event) {
                // Check if the bookmark already exists
                const existingBookmark = await storage.getBookmark(req.user.id, eventId);
                
                if (!existingBookmark) {
                  // Auto-bookmark the event
                  console.log(`Auto-bookmarking event ${eventId} for user ${req.user.id} after login`);
                  await storage.createBookmark(insertBookmarkSchema.parse({
                    userId: req.user.id,
                    eventId: eventId
                  }));
                  
                  // Clear any cached data for this event and user
                  cache.delete(`event:${eventId}:user:${req.user.id}`);
                  cache.delete(`events:user:${req.user.id}`);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error auto-bookmarking event after login:', error);
        // Don't block the redirect if bookmarking fails
      }
      
      // Redirect to the client-side app
      res.redirect(returnTo);
    }
  );
  
  // Save the returnTo URL before redirecting to Google OAuth
  app.get('/auth/google-redirect', (req, res) => {
    // Check if Google strategy is available before redirecting
    const passportAny = passport as any;
    if (!passportAny._strategies['google']) {
      console.error('Google authentication strategy not available at redirect');
      return res.redirect('/?googleAuthFailed=true&reason=strategy_not_available_redirect');
    }
    
    const returnTo = req.query.returnTo as string || '/';
    req.session.returnTo = returnTo;
    
    // Log the redirect for debugging
    console.log(`Redirecting to Google OAuth with returnTo: ${returnTo}`);
    
    res.redirect('/auth/google');
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
