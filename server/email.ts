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
  
  constructor(senderEmail: string = 'reset@quran.circle', senderName: string = 'Quran Circle') {
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
 */
export class MockEmailService implements EmailService {
  async sendPasswordResetEmail(user: User, token: string, resetUrl: string): Promise<void> {
    console.log(`[MOCK EMAIL] Password reset email for ${user.email}`);
    console.log(`[MOCK EMAIL] Reset URL: ${resetUrl}`);
    console.log(`[MOCK EMAIL] Token: ${token}`);
    return Promise.resolve();
  }
}

// Export a single instance based on environment
export const emailService = process.env.NODE_ENV === 'production' || 
                           (process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY) 
                         ? new MailjetService()
                         : new MockEmailService();