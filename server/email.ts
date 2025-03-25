import { User } from "@shared/schema";

export interface EmailService {
  sendPasswordResetEmail(user: User, token: string, resetUrl: string): Promise<void>;
}

/**
 * Email service implementation using Mailjet API
 */
export class MailjetService implements EmailService {
  private client: any;
  private clientInitPromise: Promise<any> | null = null;
  private senderEmail: string;
  private senderName: string;
  
  constructor(senderEmail: string = 'info@qurancircle.io', senderName: string = 'Quran Circle') {
    // Check if the required environment variables are set
    if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_SECRET_KEY) {
      console.warn('Mailjet API credentials are not set. Email functionality will not work.');
    }
    
    // Use the sender's email from environment variable if available
    this.senderEmail = process.env.MAILJET_SENDER_EMAIL || senderEmail;
    this.senderName = senderName;
    
    console.log(`Mailjet initialized with sender: ${this.senderEmail}`);
    
    // Initialize the client if credentials are available
    if (process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY) {
      this.initClient();
    }
  }
  
  private async initClient() {
    if (this.clientInitPromise) {
      return this.clientInitPromise;
    }
    
    this.clientInitPromise = new Promise(async (resolve, reject) => {
      try {
        // Using dynamic import for ES modules
        const mailjetModule = await import('node-mailjet');
        // Handle both default and named exports
        const Mailjet = mailjetModule.default || mailjetModule;
        
        this.client = Mailjet.apiConnect(
          process.env.MAILJET_API_KEY!,
          process.env.MAILJET_SECRET_KEY!
        );
        console.log('Mailjet client initialized successfully');
        resolve(this.client);
      } catch (error) {
        console.error('Failed to initialize Mailjet client:', error);
        reject(error);
      }
    });
    
    return this.clientInitPromise;
  }
  
  /**
   * Sends a password reset email to the user with a link containing the reset token
   */
  async sendPasswordResetEmail(user: User, token: string, resetUrl: string): Promise<void> {
    try {
      // Initialize client if needed
      if (!this.client) {
        await this.initClient();
      }
      
      // Create the HTML content for the email
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #16a34a; margin-bottom: 5px;">Quran Circle</h1>
            <p style="color: #64748b; font-size: 16px;">Password Reset Request</p>
          </div>
          <div style="margin-bottom: 30px;">
            <p>Hello ${user.username || 'there'},</p>
            <p>We received a request to reset your password for your Quran Circle account. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Reset Your Password</a>
            </div>
            <p>If you didn't request this, you can safely ignore this email.</p>
            <p>This link will expire in 1 hour.</p>
          </div>
          <div style="border-top: 1px solid #eaeaea; padding-top: 20px; font-size: 12px; color: #64748b;">
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${resetUrl}</p>
          </div>
        </div>
      `;
      
      // Prepare email data according to Mailjet API v3.1
      const data = {
        Messages: [
          {
            From: {
              Email: this.senderEmail,
              Name: this.senderName
            },
            To: [
              {
                Email: user.email,
                Name: user.username || user.email
              }
            ],
            Subject: "Reset Your Quran Circle Password",
            HTMLPart: htmlContent,
            TextPart: `Hello ${user.username || 'there'},\n\nWe received a request to reset your password for your Quran Circle account. Please visit the following link to set a new password:\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\nThis link will expire in 1 hour.\n\nThe Quran Circle Team`
          }
        ]
      };
      
      console.log(`Attempting to send email to ${user.email} from ${this.senderEmail}`);
      
      // Send email using Mailjet API
      const response = await this.client
        .post('send', { version: 'v3.1' })
        .request(data);
      
      console.log(`Password reset email sent to ${user.email}. Mailjet response status: ${response.status}`);
      
      // Log more detailed response info for debugging
      if (response.body) {
        console.log('Mailjet response:', JSON.stringify(response.body));
      }
      
    } catch (error: any) {
      console.error('Error sending password reset email:', error);
      if (error && error.response) {
        console.error('Mailjet API error response:', JSON.stringify(error.response.data));
      }
      throw new Error('Failed to send password reset email');
    }
  }
}

/**
 * Mock email service for testing or when Mailjet is not set up
 * This service simulates sending an email but actually just logs the details
 */
export class MockEmailService implements EmailService {
  async sendPasswordResetEmail(user: User, token: string, resetUrl: string): Promise<void> {
    console.log('==============================================================');
    console.log(`[MOCK EMAIL SERVICE] Password reset email would have been sent`);
    console.log(`[MOCK EMAIL] Recipient: ${user.email} (${user.username || 'no username'})`);
    console.log(`[MOCK EMAIL] Subject: Reset Your Quran Circle Password`);
    console.log(`[MOCK EMAIL] Reset URL: ${resetUrl}`);
    console.log(`[MOCK EMAIL] Token: ${token}`);
    console.log('[MOCK EMAIL] This message appears because the primary email service is unavailable');
    console.log('[MOCK EMAIL] In production, the user would receive an actual email');
    console.log('==============================================================');
    
    // Simulate a successful email send
    return Promise.resolve();
  }
}

// Export a single instance based on environment
// Create a composite email service that falls back to the mock service if Mailjet fails
export class FallbackEmailService implements EmailService {
  private primaryService: EmailService;
  private backupService: EmailService;
  private usingFallback: boolean = false;
  private lastError: any = null;

  constructor(primary: EmailService, backup: EmailService) {
    this.primaryService = primary;
    this.backupService = backup;
  }

  async sendPasswordResetEmail(user: User, token: string, resetUrl: string): Promise<void> {
    // If we've already had a failure, go straight to the backup
    if (this.usingFallback) {
      console.log('Using fallback email service based on previous failure');
      try {
        return await this.backupService.sendPasswordResetEmail(user, token, resetUrl);
      } catch (backupError) {
        console.error('Backup email service failed:', backupError);
        this.lastError = backupError;
        throw new Error('Both primary and backup email services failed');
      }
    }
    
    try {
      // Try the primary service first
      console.log('Attempting to send email using primary service...');
      await this.primaryService.sendPasswordResetEmail(user, token, resetUrl);
      console.log('Primary email service succeeded');
      return;
    } catch (primaryError) {
      console.warn('Primary email service failed, falling back to backup service', primaryError);
      this.lastError = primaryError;
      this.usingFallback = true;
      
      // Fall back to the backup service
      try {
        console.log('Attempting to send email using backup service...');
        await this.backupService.sendPasswordResetEmail(user, token, resetUrl);
        console.log('Backup email service succeeded');
        return;
      } catch (backupError) {
        console.error('Backup email service also failed:', backupError);
        throw new Error('Both primary and backup email services failed');
      }
    }
  }
  
  // Method to get the last error that occurred
  getLastError(): any {
    return this.lastError;
  }
}

// Create instances of our email services
const mailjetService = new MailjetService();
const mockEmailService = new MockEmailService();

// Export the fallback email service
export const emailService = new FallbackEmailService(mailjetService, mockEmailService);