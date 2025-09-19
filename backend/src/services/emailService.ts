import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Fallback to nodemailer for development
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const fromEmail = process.env.FROM_EMAIL || 'noreply@rapidtech.store';

    if (process.env.SENDGRID_API_KEY) {
      // Use SendGrid in production
      const msg = {
        to: options.to,
        from: fromEmail,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      };

      await sgMail.send(msg);
      logger.info(`Email sent via SendGrid to ${options.to}`);
    } else {
      // Use nodemailer for development
      const mailOptions = {
        from: fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      };

      await transporter.sendMail(mailOptions);
      logger.info(`Email sent via SMTP to ${options.to}`);
    }
  } catch (error) {
    logger.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
};

// Email templates
export const emailTemplates = {
  developerWelcome: (companyName: string, verificationUrl: string) => ({
    subject: 'Welcome to Rapid Tech Store - Verify Your Email',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Rapid Tech Store</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Welcome to Rapid Tech Store!</h1>
            <p>Transform your web apps into mobile experiences</p>
          </div>
          <div class="content">
            <h2>Hello ${companyName}!</h2>
            <p>Thank you for joining Rapid Tech Store, the premier platform for converting web applications into mobile experiences.</p>
            
            <p>To get started, please verify your email address by clicking the button below:</p>
            
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
            
            <p>After email verification, you'll need to verify domain ownership to complete your application.</p>
            
            <h3>What's Next?</h3>
            <ul>
              <li>✅ Verify your email address</li>
              <li>🌐 Verify domain ownership</li>
              <li>📋 Submit for review</li>
              <li>🎉 Start converting your apps!</li>
            </ul>
            
            <p>If you have any questions, feel free to contact our support team.</p>
          </div>
          <div class="footer">
            <p>© 2024 Rapid Tech Store. All rights reserved.</p>
            <p>If you didn't create this account, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  domainVerificationInstructions: (method: string, token: string, website: string) => ({
    subject: 'Domain Verification Instructions - Rapid Tech Store',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Domain Verification Instructions</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .code-block { background: #e9ecef; padding: 15px; border-radius: 5px; font-family: monospace; margin: 15px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Domain Verification</h1>
            <p>Verify ownership of ${website}</p>
          </div>
          <div class="content">
            ${method === 'dns' ? `
              <h2>DNS Verification Method</h2>
              <p>Add the following TXT record to your domain's DNS settings:</p>
              <div class="code-block">
                <strong>Name:</strong> _rapidtech-verification<br>
                <strong>Value:</strong> ${token}<br>
                <strong>TTL:</strong> 300 (or default)
              </div>
              <div class="warning">
                <strong>⚠️ Important:</strong> DNS changes can take up to 24 hours to propagate. You can verify immediately after adding the record.
              </div>
            ` : `
              <h2>Meta Tag Verification Method</h2>
              <p>Add the following meta tag to your website's homepage &lt;head&gt; section:</p>
              <div class="code-block">
                &lt;meta name="rapidtech-site-verification" content="${token}" /&gt;
              </div>
              <div class="warning">
                <strong>⚠️ Important:</strong> The meta tag must be placed in the &lt;head&gt; section of your homepage.
              </div>
            `}
            
            <h3>Next Steps:</h3>
            <ol>
              <li>Complete the verification setup above</li>
              <li>Return to the Developer Console</li>
              <li>Click "Verify Domain" to complete the process</li>
            </ol>
            
            <p>Once verified, your application will be submitted for review by our team.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  applicationApproved: (companyName: string) => ({
    subject: '🎉 Application Approved - Welcome to Rapid Tech Store!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Approved</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .feature-list { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Congratulations ${companyName}!</h1>
            <p>You are now a Rapid Tech Partner</p>
          </div>
          <div class="content">
            <h2>Your Application Has Been Approved!</h2>
            <p>Welcome to the Rapid Tech Store ecosystem. You can now start converting your web applications into mobile experiences and reach millions of users.</p>
            
            <a href="${process.env.CONSOLE_URL}" class="button">Access Developer Console</a>
            
            <div class="feature-list">
              <h3>🚀 What You Can Do Now:</h3>
              <ul>
                <li>Convert your web apps to mobile experiences</li>
                <li>Publish apps to the Rapid Tech Store</li>
                <li>Set up subscription plans and pricing</li>
                <li>Access real-time analytics and insights</li>
                <li>Receive automated monthly payouts</li>
              </ul>
            </div>
            
            <h3>📚 Getting Started:</h3>
            <ol>
              <li>Log in to your Developer Console</li>
              <li>Submit your first app for conversion</li>
              <li>Configure your app settings and pricing</li>
              <li>Publish to the marketplace</li>
            </ol>
            
            <p>Our team is here to support you every step of the way. If you have any questions, don't hesitate to reach out!</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  applicationRejected: (companyName: string, reason: string) => ({
    subject: 'Application Update - Rapid Tech Store',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .reason-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application Update</h1>
            <p>${companyName}</p>
          </div>
          <div class="content">
            <h2>Application Status Update</h2>
            <p>Thank you for your interest in becoming a Rapid Tech Partner. After careful review, we are unable to approve your application at this time.</p>
            
            <div class="reason-box">
              <h3>📋 Reason for Rejection:</h3>
              <p>${reason}</p>
            </div>
            
            <h3>🔄 Next Steps:</h3>
            <ul>
              <li>Address the concerns mentioned above</li>
              <li>Update your website or business information as needed</li>
              <li>Resubmit your application when ready</li>
            </ul>
            
            <p>We encourage you to reapply once you've addressed the mentioned concerns. Our team is committed to helping legitimate businesses succeed on our platform.</p>
            
            <a href="${process.env.CONSOLE_URL}" class="button">Reapply Now</a>
            
            <p>If you have any questions about this decision, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};