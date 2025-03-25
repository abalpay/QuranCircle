import { Express, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile as GoogleProfile, VerifyCallback as GoogleVerifyCallback } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy, Profile as GitHubProfile } from 'passport-github2';
import { storage } from './storage';
import { User, InsertUser } from '@shared/schema';

// Initialize OAuth strategies
export function setupOAuth(app: Express) {
  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
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

  // GitHub OAuth Strategy
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID || '',
        clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
        callbackURL: '/auth/github/callback',
        scope: ['user:email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists with this provider ID
          const existingUser = await storage.getUserByProviderId('github', profile.id);
          
          if (existingUser) {
            return done(null, existingUser);
          }
          
          // Get email from GitHub
          const email = profile.emails && profile.emails[0]?.value;
          const username = (profile.username || profile.displayName || 'user').replace(/\s+/g, '') + Math.floor(Math.random() * 1000);
          
          // Check if user with this email already exists
          const existingEmailUser = email ? await storage.getUserByEmail(email) : undefined;
          if (existingEmailUser) {
            // Link this provider to existing user
            await storage.linkProviderToUser(existingEmailUser.id, 'github', profile.id);
            return done(null, existingEmailUser);
          }
          
          // Create new user
          const newUser = await storage.createUser({
            username,
            email: email || `${username}@placeholder.com`,
            password: '', // No password for OAuth users
            providerType: 'github',
            providerId: profile.id,
          });
          
          done(null, newUser);
        } catch (error) {
          done(error as Error, undefined);
        }
      },
    ),
  );

  // Setup OAuth routes
  setupOAuthRoutes(app);
}

// Set up OAuth routes
function setupOAuthRoutes(app: Express) {
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

  // GitHub OAuth routes
  app.get(
    '/auth/github',
    passport.authenticate('github', { scope: ['user:email'] })
  );

  app.get(
    '/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/' }),
    (req: Request, res: Response) => {
      // Successful authentication, redirect to app
      res.redirect('/');
    }
  );
}