import { Express, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile, VerifyCallback as GoogleVerifyCallback } from 'passport-google-oauth20';
import { storage } from './storage';
import { User, InsertUser } from '@shared/schema';
import { log } from './vite';

// Initialize OAuth strategies
export function setupOAuth(app: Express) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  // Only set up Google OAuth if credentials are provided
  if (googleClientId && googleClientSecret) {
    // Google OAuth Strategy
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleClientId,
          clientSecret: googleClientSecret,
          callbackURL: '/auth/google/callback',
          scope: ['profile', 'email'],
        },
        async (accessToken: string, refreshToken: string, profile: GoogleProfile, done: GoogleVerifyCallback) => {
          try {
            // Check if user exists with this provider ID
            const existingUser = await storage.getUserByProviderId('google', profile.id);
            
            if (existingUser) {
              return done(null, existingUser);
            }
            
            // Create new user if doesn't exist
            const email = profile.emails && profile.emails[0]?.value;
            const username = (profile.displayName || email || 'user').replace(/\s+/g, '') + Math.floor(Math.random() * 1000);
            
            // Check if user with this email already exists
            const existingEmailUser = email ? await storage.getUserByEmail(email) : undefined;
            if (existingEmailUser) {
              // Link this provider to existing user
              await storage.linkProviderToUser(existingEmailUser.id, 'google', profile.id);
              return done(null, existingEmailUser);
            }
            
            // Create new user
            const newUser = await storage.createUser({
              username,
              email: email || `${username}@placeholder.com`,
              password: '', // No password for OAuth users
              providerType: 'google',
              providerId: profile.id,
            });
            
            done(null, newUser);
          } catch (error) {
            done(error as Error, undefined);
          }
        },
      ),
    );
    
    log("Google OAuth strategy configured successfully", "oauth");
  } else {
    log("Google OAuth credentials not found, authentication with Google is disabled", "oauth");
  }

  // Setup OAuth routes
  setupOAuthRoutes(app);
}

// Set up OAuth routes
function setupOAuthRoutes(app: Express) {
  // Only set up routes if Google OAuth is configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // Google OAuth routes
    app.get(
      '/auth/google',
      passport.authenticate('google', { scope: ['profile', 'email'] })
    );

    app.get(
      '/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/' }),
      (req: Request, res: Response) => {
        // Successful authentication, redirect to app
        res.redirect('/');
      }
    );
    
    log("Google OAuth routes configured", "oauth");
  } else {
    // Add a fallback route to handle cases where buttons are clicked but OAuth is not configured
    app.get('/auth/google', (req: Request, res: Response) => {
      res.status(501).send('Google authentication not configured. Please set up GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
    });
  }
}