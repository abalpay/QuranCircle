import Mailjet from 'node-mailjet';
import { User } from '@shared/schema';

// Initialize Mailjet client with API credentials
const mailjet = new Mailjet({
  apiKey: process.env.MAILJET_API_KEY || '',
  apiSecret: process.env.MAILJET_SECRET_KEY || ''
});

export interface EmailService {
  sendPasswordResetEmail(user: User, token: string, resetUrl: string): Promise<void>;
}

export class MailjetService implements EmailService {
  private senderEmail: string;
  private senderName: string;

  constructor(senderEmail: string = 'reset@quran.circle', senderName: string = 'Quran Circle') {
    this.senderEmail = senderEmail;
    this.senderName = senderName;
  }

  /**
   * Sends a password reset email to the user with a link containing the reset token
   */
  async sendPasswordResetEmail(user: User, token: string, resetUrl: string): Promise<void> {
    try {
      const response = await mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: this.senderEmail,
              Name: this.senderName
            },
            To: [
              {
                Email: user.email || '',
                Name: user.username
              }
            ],
            Subject: 'Reset Your Quran Circle Password',
            TextPart: `
Hello ${user.username},

You recently requested to reset your password for your Quran Circle account. 
Use the link below to reset it. This password reset link is only valid for 1 hour.

${resetUrl}

If you did not request a password reset, please ignore this email or contact support if you have questions.

Warm regards,
The Quran Circle Team
            `,
            HTMLPart: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4CAF50; padding: 20px; text-align: center; color: white; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; 
              text-decoration: none; border-radius: 4px; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Quran Circle Password Reset</h1>
    </div>
    <div class="content">
      <p>Hello ${user.username},</p>
      <p>You recently requested to reset your password for your Quran Circle account.</p>
      <p>Click the button below to reset your password. This link is only valid for 1 hour.</p>
      <p style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
        <a href="${resetUrl}" class="button">Reset Your Password</a>
      </p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p>${resetUrl}</p>
      <p>If you did not request a password reset, please ignore this email or contact our support team if you have questions.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Quran Circle. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
            `
          }
        ]
      });
      
      console.log('Password reset email sent successfully');
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}

// Create a singleton instance of the email service
export const emailService = new MailjetService();