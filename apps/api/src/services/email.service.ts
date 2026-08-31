/**
 * Email Service — Resend primary, SMTP fallback (Nodemailer)
 * Set SMTP_HOST + SMTP_USER + SMTP_PASS in .env to enable SMTP delivery.
 * SMTP takes priority over Resend when both are configured.
 */
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{ filename: string; content: string | Buffer }>;
}

interface UserCreationEmailData {
  name: string;
  email: string;
  password: string;
  role: string;
}

class EmailService {
  private resend: Resend | null = null;
  private fromEmail: string;
  private fromName: string;
  private smtpTransport: nodemailer.Transporter | null = null;
  private smtpFrom: string = '';

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || '';
    this.fromName = 'KPT Partner Portal';

    // ── SMTP setup (takes priority if configured) ──────────────────────────────
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpFrom = process.env.SMTP_FROM || smtpUser || '';

    if (smtpHost && smtpUser && smtpPass) {
      this.smtpTransport = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      this.smtpFrom = `${this.fromName} <${smtpFrom}>`;
      console.log('[EmailService] SMTP configured:', { host: smtpHost, port: smtpPort, user: smtpUser });
    } else {
      console.log('[EmailService] SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing)');
    }

    // ── Resend setup (used when SMTP not configured) ───────────────────────────
    if (!smtpHost) {
      if (!apiKey) {
        console.warn('[EmailService] RESEND_API_KEY is not set — emails will not be delivered');
      } else {
        this.resend = new Resend(apiKey);
      }

      if (!this.fromEmail) {
        console.warn('[EmailService] RESEND_FROM_EMAIL is not set — emails will not be delivered');
      }
    }

    console.log('[EmailService] Active transport:', this.smtpTransport ? 'SMTP' : (this.resend ? 'Resend' : 'NONE'));
  }

  private escapeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Generate branded email template wrapper
   */
  private generateBrandedEmailTemplate(title: string, content: string, isPasswordReset: boolean = false): string {
    const companyName = 'KPT — Kulkarni Power Tools';
    const headerBgColor = isPasswordReset ? '#3b82f6' : '#facc15';
    const headerTextColor = '#1a1a1a';

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <title>${this.escapeHtml(title)}</title>
        <!--[if mso]>
        <style type="text/css">
          table {border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}
        </style>
        <![endif]-->
      </head>
      <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background-color:#f5f5f5;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f5f5f5;">
          <tr>
            <td align="center" style="padding:20px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#ffffff;border:1px solid #e0e0e0;">
                <!-- Header -->
                <tr>
                  <td style="background-color:${headerBgColor};padding:40px 30px;text-align:center;">
                    <h1 style="margin:0;font-size:32px;font-weight:bold;color:${headerTextColor};font-family:Arial,Helvetica,sans-serif;">${companyName}</h1>
                  </td>
                </tr>
                <!-- Content -->
                <tr>
                  <td style="padding:40px 30px;background-color:#ffffff;">
                    ${content}
                    <!-- Footer -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding-top:30px;border-top:1px solid #e0e0e0;text-align:center;">
                          <p style="margin:8px 0;font-size:12px;color:#737373;">This is an automated message. Please do not reply to this email.</p>
                          <p style="margin:8px 0;font-size:12px;color:#737373;">&copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Send a transactional email.
   * Uses SMTP (Nodemailer) when SMTP_HOST/SMTP_USER/SMTP_PASS are set in .env,
   * otherwise falls back to Resend. Returns true only on confirmed delivery.
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    // ── SMTP path ──────────────────────────────────────────────────────────────
    if (this.smtpTransport) {
      try {
        console.log('[EmailService] Sending email via SMTP:', { to: options.to, subject: options.subject });
        await this.smtpTransport.sendMail({
          from: this.smtpFrom,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          replyTo: options.replyTo,
          cc: options.cc,
          bcc: options.bcc,
        });
        console.log('[EmailService] SMTP delivery accepted for:', options.to);
        return true;
      } catch (err) {
        console.error('[EmailService] SMTP delivery failed:', err instanceof Error ? err.message : 'Unknown error');
        return false;
      }
    }

    // ── Resend path ────────────────────────────────────────────────────────────
    if (!this.resend) {
      console.error('[EmailService] Cannot send email: RESEND_API_KEY is not configured.');
      return false;
    }

    if (!this.fromEmail) {
      console.error('[EmailService] Cannot send email: RESEND_FROM_EMAIL is not configured.');
      return false;
    }

    const from = `${this.fromName} <${this.fromEmail}>`;

    console.log('[EmailService] Sending email via Resend:', {
      to: options.to,
      subject: options.subject,
      from,
    });

    try {
      const payload: Record<string, unknown> = {
        from,
        to: options.to,
        subject: options.subject,
      };
      if (options.html) payload.html = options.html;
      if (options.text) payload.text = options.text;
      if (options.replyTo) payload.reply_to = options.replyTo;
      if (options.cc && options.cc.length > 0) payload.cc = options.cc;
      if (options.bcc && options.bcc.length > 0) payload.bcc = options.bcc;
      if (options.attachments && options.attachments.length > 0) payload.attachments = options.attachments;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await this.resend.emails.send(payload as any);

      if (error) {
        console.error('[EmailService] Resend delivery error:', {
          name: error.name,
          statusCode: (error as any).statusCode,
          message: error.message,
        });
        if (error.message?.toLowerCase().includes('domain') || error.message?.toLowerCase().includes('verified')) {
          console.error('[EmailService] *** Resend domain not verified. Fix: set SMTP_HOST+SMTP_USER+SMTP_PASS in .env, OR verify the domain at https://resend.com/domains ***');
        }
        return false;
      }

      console.log('[EmailService] Email accepted by Resend, id:', data?.id);
      return true;
    } catch (err) {
      console.error('[EmailService] Unexpected error sending email via Resend:', err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Send user creation email with Account ID & Password
   */
  async sendUserCreationEmail(data: UserCreationEmailData): Promise<boolean> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const subject = 'Welcome to KPT CRM - Your Account Details';

    const content = `
      <h1 style="margin:0 0 24px 0;font-size:32px;font-weight:bold;color:#2563EB;text-align:center;font-family:Arial,Helvetica,sans-serif;">Welcome to KPT CRM!</h1>

      <p style="margin:0 0 16px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Hi <strong style="color:#1a1a1a;">${this.escapeHtml(data.name)}</strong>,</p>

      <p style="margin:0 0 30px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Your account has been successfully created by the system administrator. You can now access the KPT CRM with the following credentials:</p>

      <!-- Credentials Box -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fef9c3;border:2px solid #facc15;margin:30px 0;">
        <tr>
          <td style="padding:4px;background-color:#facc15;"></td>
        </tr>
        <tr>
          <td style="padding:30px;">
            <!-- Account ID -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #e0e0e0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="140" style="font-weight:bold;color:#1a1a1a;font-size:15px;font-family:Arial,Helvetica,sans-serif;">Account ID:</td>
                      <td style="font-family:'Courier New',monospace;background-color:#ffffff;color:#1a1a1a;padding:12px 16px;border:1px solid #facc15;font-size:14px;font-weight:600;">${this.escapeHtml(data.email)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #e0e0e0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="140" style="font-weight:bold;color:#1a1a1a;font-size:15px;font-family:Arial,Helvetica,sans-serif;">Password:</td>
                      <td style="font-family:'Courier New',monospace;background-color:#ffffff;color:#1a1a1a;padding:12px 16px;border:1px solid #facc15;font-size:14px;font-weight:600;">${this.escapeHtml(data.password)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="140" style="font-weight:bold;color:#1a1a1a;font-size:15px;font-family:Arial,Helvetica,sans-serif;">Role:</td>
                      <td style="font-family:'Courier New',monospace;background-color:#ffffff;color:#1a1a1a;padding:12px 16px;border:1px solid #facc15;font-size:14px;font-weight:600;">${this.escapeHtml(data.role)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Security Notice -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9f9f9;border-left:4px solid #facc15;margin:30px 0;">
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 12px 0;font-size:15px;font-weight:bold;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;">Important Security Notice:</p>
            <ul style="margin:0;padding-left:20px;color:#737373;font-size:14px;line-height:1.8;">
              <li style="margin-bottom:8px;">Please change your password immediately after your first login</li>
              <li style="margin-bottom:8px;">Do not share your credentials with anyone</li>
              <li style="margin-bottom:8px;">This is a temporary password and should be changed for security purposes</li>
            </ul>
          </td>
        </tr>
      </table>

      <!-- Button -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding:32px 0;">
            <a href="${frontendUrl}/login" style="display:inline-block;background-color:#facc15;color:#1a1a1a;padding:14px 36px;text-decoration:none;font-weight:bold;font-size:16px;font-family:Arial,Helvetica,sans-serif;border:2px solid #eab308;">Go to Dashboard</a>
          </td>
        </tr>
      </table>

      <!-- Signature -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding-top:32px;">
            <p style="margin:0 0 8px 0;font-size:14px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">If you have any questions or need assistance, please contact your system administrator.</p>
            <p style="margin:0;font-size:14px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Best regards,<br><strong style="color:#1a1a1a;">KPT CRM Team</strong></p>
          </td>
        </tr>
      </table>
    `;

    const html = this.generateBrandedEmailTemplate('Welcome to KPT CRM', content, false);
    return this.sendEmail({ to: data.email, subject, html });
  }

  /**
   * Send password reset OTP email
   */
  async sendPasswordResetOtpEmail(email: string, name: string, otp: string): Promise<boolean> {
    const subject = 'Password Reset OTP - KPT CRM';

    const content = `
      <h1 style="margin:0 0 24px 0;font-size:32px;font-weight:bold;color:#3b82f6;text-align:center;font-family:Arial,Helvetica,sans-serif;">Password Reset Verification Code</h1>

      <p style="margin:0 0 16px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Hi <strong style="color:#1a1a1a;">${this.escapeHtml(name)}</strong>,</p>

      <p style="margin:0 0 30px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">We received a request to reset your password. Please use the verification code below to proceed:</p>

      <!-- OTP Box -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#dbeafe;border:3px solid #3b82f6;margin:30px 0;">
        <tr>
          <td style="padding:4px;background-color:#3b82f6;"></td>
        </tr>
        <tr>
          <td align="center" style="padding:40px 30px;">
            <p style="margin:0 0 12px 0;font-size:15px;color:#737373;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">Your verification code:</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:'Courier New',monospace;font-size:42px;font-weight:bold;letter-spacing:12px;color:#1a1a1a;background-color:#ffffff;padding:24px 40px;border:2px solid #3b82f6;">${this.escapeHtml(otp)}</td>
              </tr>
            </table>
            <p style="margin:20px 0 0 0;font-size:13px;color:#737373;font-weight:600;font-family:Arial,Helvetica,sans-serif;">This code will expire in 10 minutes</p>
          </td>
        </tr>
      </table>

      <!-- Security Notice -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9f9f9;border-left:4px solid #3b82f6;margin:30px 0;">
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 12px 0;font-size:15px;font-weight:bold;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;">Security Notice:</p>
            <ul style="margin:0;padding-left:20px;color:#737373;font-size:14px;line-height:1.8;">
              <li style="margin-bottom:8px;">This code will expire in 10 minutes</li>
              <li style="margin-bottom:8px;">If you didn't request this, please ignore this email</li>
              <li style="margin-bottom:8px;">Never share this code with anyone</li>
              <li style="margin-bottom:8px;">Do not reply to this email - the code is sent automatically</li>
            </ul>
          </td>
        </tr>
      </table>

      <!-- Signature -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding-top:32px;">
            <p style="margin:0 0 8px 0;font-size:14px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">If you have any questions or need assistance, please contact your system administrator.</p>
            <p style="margin:0;font-size:14px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Best regards,<br><strong style="color:#1a1a1a;">KPT Team</strong></p>
          </td>
        </tr>
      </table>
    `;

    const html = this.generateBrandedEmailTemplate('Password Reset OTP', content, true);
    return this.sendEmail({ to: email, subject, html });
  }

  /**
   * Send lead assignment notification email
   */
  async sendLeadAssignmentNotificationEmail(email: string, name: string, leadCount: number): Promise<boolean> {
    const portalUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
    const subject = 'New Leads Assigned to You - KPT CRM';

    const content = `
      <h1 style="margin:0 0 24px 0;font-size:32px;font-weight:bold;color:#facc15;text-align:center;font-family:Arial,Helvetica,sans-serif;">New Leads Assigned to You</h1>

      <p style="margin:0 0 16px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Hi <strong style="color:#1a1a1a;">${this.escapeHtml(name)}</strong>,</p>

      <p style="margin:0 0 30px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">You have been assigned ${leadCount} new lead${leadCount > 1 ? 's' : ''} in the CRM system.</p>

      <!-- Lead Count Box -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fef9c3;border:2px solid #facc15;margin:30px 0;">
        <tr>
          <td style="padding:4px;background-color:#facc15;"></td>
        </tr>
        <tr>
          <td align="center" style="padding:40px 30px;">
            <p style="margin:0 0 12px 0;font-size:15px;font-weight:bold;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;">${leadCount === 1 ? 'Assigned Lead' : 'Assigned Leads'}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:'Courier New',monospace;font-size:48px;font-weight:bold;color:#1a1a1a;background-color:#ffffff;padding:24px 40px;border:2px solid #facc15;">${leadCount}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Button -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding:32px 0;">
            <a href="${portalUrl}" style="display:inline-block;background-color:#facc15;color:#1a1a1a;padding:14px 36px;text-decoration:none;font-weight:bold;font-size:16px;font-family:Arial,Helvetica,sans-serif;border:2px solid #eab308;">Login to Portal</a>
          </td>
        </tr>
      </table>

      <!-- Signature -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding-top:32px;">
            <p style="margin:0 0 8px 0;font-size:14px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">If you have any questions or need assistance, please contact your system administrator.</p>
            <p style="margin:0;font-size:14px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Best regards,<br><strong style="color:#1a1a1a;">KPT Team</strong></p>
          </td>
        </tr>
      </table>
    `;

    const html = this.generateBrandedEmailTemplate('New Leads Assigned to You', content, false);
    return this.sendEmail({ to: email, subject, html });
  }

  /**
   * Send password reset email with reset token link
   */
  async sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request - KPT CRM';

    const content = `
      <h1 style="margin:0 0 24px 0;font-size:32px;font-weight:bold;color:#3b82f6;text-align:center;font-family:Arial,Helvetica,sans-serif;">Password Reset Request</h1>

      <p style="margin:0 0 16px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Hi <strong style="color:#1a1a1a;">${this.escapeHtml(name)}</strong>,</p>

      <p style="margin:0 0 30px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">We received a request to reset your password. Click the button below to create a new password:</p>

      <!-- Button -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding:32px 0;">
            <a href="${resetUrl}" style="display:inline-block;background-color:#3b82f6;color:#ffffff;padding:14px 36px;text-decoration:none;font-weight:bold;font-size:16px;font-family:Arial,Helvetica,sans-serif;border:2px solid #2563eb;">Reset Password</a>
          </td>
        </tr>
      </table>

      <!-- Security Notice -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9f9f9;border-left:4px solid #3b82f6;margin:30px 0;">
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 12px 0;font-size:15px;font-weight:bold;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;">Security Notice:</p>
            <ul style="margin:0;padding-left:20px;color:#737373;font-size:14px;line-height:1.8;">
              <li style="margin-bottom:8px;">This link will expire in 1 hour</li>
              <li style="margin-bottom:8px;">If you didn't request this, please ignore this email</li>
              <li style="margin-bottom:8px;">Never share this link with anyone</li>
            </ul>
          </td>
        </tr>
      </table>

      <!-- Alternative Link -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding-top:24px;">
            <p style="margin:0 0 12px 0;font-size:14px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">If the button doesn't work, copy and paste this link into your browser:</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9f9f9;border:1px solid #3b82f6;">
              <tr>
                <td style="padding:14px 16px;font-family:'Courier New',monospace;font-size:14px;color:#737373;word-break:break-all;">${this.escapeHtml(resetUrl)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Signature -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding-top:32px;">
            <p style="margin:0 0 8px 0;font-size:14px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">If you have any questions or need assistance, please contact your system administrator.</p>
            <p style="margin:0;font-size:14px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Best regards,<br><strong style="color:#1a1a1a;">KPT Team</strong></p>
          </td>
        </tr>
      </table>
    `;

    const html = this.generateBrandedEmailTemplate('Password Reset Request', content, true);
    return this.sendEmail({ to: email, subject, html });
  }

  /**
   * Send Aakraman login OTP email
   * For sales users logging into the order booking system
   */
  async sendAakramanOtpEmail(email: string, name: string, otp: string): Promise<boolean> {
    const subject = 'Login OTP - Aakraman Order Booking';

    const content = `
      <h1 style="margin:0 0 24px 0;font-size:32px;font-weight:bold;color:#facc15;text-align:center;font-family:Arial,Helvetica,sans-serif;">Aakraman Login Verification</h1>

      <p style="margin:0 0 16px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Hi <strong style="color:#1a1a1a;">${this.escapeHtml(name)}</strong>,</p>

      <p style="margin:0 0 30px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Use the verification code below to login to the Aakraman Order Booking system:</p>

      <!-- OTP Box -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fef9c3;border:3px solid #facc15;margin:30px 0;">
        <tr>
          <td style="padding:4px;background-color:#facc15;"></td>
        </tr>
        <tr>
          <td align="center" style="padding:40px 30px;">
            <p style="margin:0 0 12px 0;font-size:15px;color:#737373;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">Your verification code:</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:'Courier New',monospace;font-size:42px;font-weight:bold;letter-spacing:12px;color:#1a1a1a;background-color:#ffffff;padding:24px 40px;border:2px solid #facc15;">${this.escapeHtml(otp)}</td>
              </tr>
            </table>
            <p style="margin:20px 0 0 0;font-size:13px;color:#737373;font-weight:600;font-family:Arial,Helvetica,sans-serif;">This code will expire in 10 minutes</p>
          </td>
        </tr>
      </table>

      <!-- Security Notice -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9f9f9;border-left:4px solid #facc15;margin:30px 0;">
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 12px 0;font-size:15px;font-weight:bold;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;">Security Notice:</p>
            <ul style="margin:0;padding-left:20px;color:#737373;font-size:14px;line-height:1.8;">
              <li style="margin-bottom:8px;">This code will expire in 10 minutes</li>
              <li style="margin-bottom:8px;">If you didn't request this, please ignore this email</li>
              <li style="margin-bottom:8px;">Never share this code with anyone</li>
            </ul>
          </td>
        </tr>
      </table>

      <!-- Signature -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="padding-top:32px;">
            <p style="margin:0;font-size:14px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Best regards,<br><strong style="color:#1a1a1a;">KPT Team</strong></p>
          </td>
        </tr>
      </table>
    `;

    const html = this.generateBrandedEmailTemplate('Aakraman Login OTP', content, false);
    return this.sendEmail({ to: email, subject, html });
  }

  /**
   * Send approval request notification to the assigned approver
   */
  async sendApprovalRequestEmail(data: {
    approverName: string;
    approverEmail: string;
    requesterName: string;
    objectType: 'Opportunity' | 'Quote';
    objectName: string;
    objectNumber: string;
    approvalId: number;
  }): Promise<boolean> {
    const subject = `Action Required: ${data.objectType} Approval Request - ${data.objectNumber}`;

    const content = `
      <h1 style="margin:0 0 24px 0;font-size:28px;font-weight:bold;color:#facc15;text-align:center;font-family:Arial,Helvetica,sans-serif;">Approval Request</h1>

      <p style="margin:0 0 16px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Hi <strong style="color:#1a1a1a;">${this.escapeHtml(data.approverName)}</strong>,</p>

      <p style="margin:0 0 24px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
        <strong style="color:#1a1a1a;">${this.escapeHtml(data.requesterName)}</strong> has submitted a ${data.objectType.toLowerCase()} for your approval.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#fef9c3;border:2px solid #facc15;margin:24px 0;">
        <tr><td style="padding:4px;background-color:#facc15;"></td></tr>
        <tr>
          <td style="padding:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #e0e0e0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="160" style="font-weight:bold;color:#1a1a1a;font-size:14px;font-family:Arial,Helvetica,sans-serif;">Type:</td>
                      <td style="color:#1a1a1a;font-size:14px;font-family:Arial,Helvetica,sans-serif;">${this.escapeHtml(data.objectType)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;border-bottom:1px solid #e0e0e0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="160" style="font-weight:bold;color:#1a1a1a;font-size:14px;font-family:Arial,Helvetica,sans-serif;">Reference:</td>
                      <td style="color:#1a1a1a;font-size:14px;font-family:Arial,Helvetica,sans-serif;">${this.escapeHtml(data.objectNumber)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="160" style="font-weight:bold;color:#1a1a1a;font-size:14px;font-family:Arial,Helvetica,sans-serif;">Name:</td>
                      <td style="color:#1a1a1a;font-size:14px;font-family:Arial,Helvetica,sans-serif;">${this.escapeHtml(data.objectName)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:24px 0 8px 0;font-size:15px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Please log in to the CRM to review and take action on this request (Approval ID: <strong style="color:#1a1a1a;">#${data.approvalId}</strong>).</p>

      <p style="margin:0;font-size:14px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Best regards,<br><strong style="color:#1a1a1a;">KPT Team</strong></p>
    `;

    const html = this.generateBrandedEmailTemplate('Approval Request', content, false);
    return this.sendEmail({ to: data.approverEmail, subject, html });
  }

  /**
   * Send approval outcome notification to the original requester
   */
  async sendApprovalActionEmail(data: {
    requesterName: string;
    requesterEmail: string;
    actorName: string;
    action: 'APPROVED' | 'REJECTED';
    objectType: 'Opportunity' | 'Quote';
    objectName: string;
    objectNumber: string;
    comment?: string;
  }): Promise<boolean> {
    const isApproved = data.action === 'APPROVED';
    const subject = `${data.objectType} ${isApproved ? 'Approved' : 'Rejected'} - ${data.objectNumber}`;
    const accentColor = isApproved ? '#22c55e' : '#ef4444';
    const accentBg = isApproved ? '#dcfce7' : '#fee2e2';

    const content = `
      <h1 style="margin:0 0 24px 0;font-size:28px;font-weight:bold;color:${accentColor};text-align:center;font-family:Arial,Helvetica,sans-serif;">
        ${data.objectType} ${isApproved ? 'Approved' : 'Rejected'}
      </h1>

      <p style="margin:0 0 16px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Hi <strong style="color:#1a1a1a;">${this.escapeHtml(data.requesterName)}</strong>,</p>

      <p style="margin:0 0 24px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
        Your ${data.objectType.toLowerCase()} has been <strong style="color:${accentColor};">${isApproved ? 'approved' : 'rejected'}</strong> by <strong style="color:#1a1a1a;">${this.escapeHtml(data.actorName)}</strong>.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${accentBg};border:2px solid ${accentColor};margin:24px 0;">
        <tr><td style="padding:4px;background-color:${accentColor};"></td></tr>
        <tr>
          <td style="padding:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td style="padding:6px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="160" style="font-weight:bold;color:#1a1a1a;font-size:14px;font-family:Arial,Helvetica,sans-serif;">Reference:</td>
                      <td style="color:#1a1a1a;font-size:14px;font-family:Arial,Helvetica,sans-serif;">${this.escapeHtml(data.objectNumber)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="160" style="font-weight:bold;color:#1a1a1a;font-size:14px;font-family:Arial,Helvetica,sans-serif;">Name:</td>
                      <td style="color:#1a1a1a;font-size:14px;font-family:Arial,Helvetica,sans-serif;">${this.escapeHtml(data.objectName)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="160" style="font-weight:bold;color:#1a1a1a;font-size:14px;font-family:Arial,Helvetica,sans-serif;">Decision:</td>
                      <td style="color:${accentColor};font-size:14px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">${isApproved ? 'APPROVED' : 'REJECTED'}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              ${data.comment ? `
              <tr>
                <td style="padding:6px 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      <td width="160" style="font-weight:bold;color:#1a1a1a;font-size:14px;font-family:Arial,Helvetica,sans-serif;vertical-align:top;">Comment:</td>
                      <td style="color:#737373;font-size:14px;font-family:Arial,Helvetica,sans-serif;">${this.escapeHtml(data.comment)}</td>
                    </tr>
                  </table>
                </td>
              </tr>` : ''}
            </table>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:14px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Best regards,<br><strong style="color:#1a1a1a;">KPT Team</strong></p>
    `;

    const html = this.generateBrandedEmailTemplate(`${data.objectType} ${isApproved ? 'Approved' : 'Rejected'}`, content, isApproved);
    return this.sendEmail({ to: data.requesterEmail, subject, html });
  }

  /**
   * Send approved quote to client with inline summary and S3 PDF link
   */
  async sendQuoteEmail(data: {
    to: string;
    contactName: string;
    subject?: string;
    message?: string;
    cc?: string[];
    bcc?: string[];
    quote: {
      quoteNumber: string;
      name: string;
      validUntil?: Date | null;
      grandTotal: number;
      subtotal: number;
      discount: number;
      discountPercent: number;
      taxAmount: number;
      taxPercent: number;
      shippingAmount: number;
      paymentTerms?: string | null;
      deliveryTerms?: string | null;
      notes?: string | null;
      pdfUrl: string;
      lineItems: Array<{
        productName: string;
        quantity: number;
        unitPrice: number;
        discount: number;
        totalPrice: number;
      }>;
    };
  }): Promise<boolean> {
    const subject = data.subject || `Quote ${data.quote.quoteNumber} from KPT`;

    const lineItemRows = data.quote.lineItems.map((item, i) => `
      <tr style="background-color:${i % 2 === 0 ? '#ffffff' : '#f9fafb'};">
        <td style="padding:8px 12px;font-size:13px;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;border-bottom:1px solid #e0e0e0;">${this.escapeHtml(item.productName)}</td>
        <td style="padding:8px 12px;font-size:13px;color:#1a1a1a;text-align:center;font-family:Arial,Helvetica,sans-serif;border-bottom:1px solid #e0e0e0;">${item.quantity}</td>
        <td style="padding:8px 12px;font-size:13px;color:#1a1a1a;text-align:right;font-family:Arial,Helvetica,sans-serif;border-bottom:1px solid #e0e0e0;">${Number(item.unitPrice).toFixed(2)}</td>
        <td style="padding:8px 12px;font-size:13px;color:#1a1a1a;text-align:right;font-family:Arial,Helvetica,sans-serif;border-bottom:1px solid #e0e0e0;">${Number(item.discount).toFixed(2)}%</td>
        <td style="padding:8px 12px;font-size:13px;color:#1a1a1a;text-align:right;font-family:Arial,Helvetica,sans-serif;border-bottom:1px solid #e0e0e0;font-weight:bold;">${Number(item.totalPrice).toFixed(2)}</td>
      </tr>
    `).join('');

    const content = `
      <h1 style="margin:0 0 24px 0;font-size:28px;font-weight:bold;color:#facc15;text-align:center;font-family:Arial,Helvetica,sans-serif;">Quote ${this.escapeHtml(data.quote.quoteNumber)}</h1>

      <p style="margin:0 0 16px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Dear <strong style="color:#1a1a1a;">${this.escapeHtml(data.contactName)}</strong>,</p>

      ${data.message ? `<p style="margin:0 0 24px 0;font-size:15px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">${this.escapeHtml(data.message)}</p>` : `<p style="margin:0 0 24px 0;font-size:15px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Please find your quote details below. You can also download the full PDF using the button at the bottom of this email.</p>`}

      <!-- Quote Summary -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px 0;">
        <tr>
          <td style="padding:6px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="180" style="font-weight:bold;color:#1a1a1a;font-size:14px;font-family:Arial,Helvetica,sans-serif;">Quote Reference:</td>
                <td style="color:#737373;font-size:14px;font-family:Arial,Helvetica,sans-serif;">${this.escapeHtml(data.quote.quoteNumber)}</td>
              </tr>
            </table>
          </td>
        </tr>
        ${data.quote.validUntil ? `
        <tr>
          <td style="padding:6px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                <td width="180" style="font-weight:bold;color:#1a1a1a;font-size:14px;font-family:Arial,Helvetica,sans-serif;">Valid Until:</td>
                <td style="color:#737373;font-size:14px;font-family:Arial,Helvetica,sans-serif;">${new Date(data.quote.validUntil).toLocaleDateString()}</td>
              </tr>
            </table>
          </td>
        </tr>` : ''}
      </table>

      <!-- Line Items Table -->
      <p style="margin:0 0 8px 0;font-size:14px;font-weight:bold;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;">Items</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="1" width="100%" style="border-collapse:collapse;border-color:#e0e0e0;margin:0 0 24px 0;">
        <tr style="background-color:#facc15;">
          <th style="padding:10px 12px;font-size:12px;color:#1a1a1a;text-align:left;font-family:Arial,Helvetica,sans-serif;">Product</th>
          <th style="padding:10px 12px;font-size:12px;color:#1a1a1a;text-align:center;font-family:Arial,Helvetica,sans-serif;">Qty</th>
          <th style="padding:10px 12px;font-size:12px;color:#1a1a1a;text-align:right;font-family:Arial,Helvetica,sans-serif;">Unit Price</th>
          <th style="padding:10px 12px;font-size:12px;color:#1a1a1a;text-align:right;font-family:Arial,Helvetica,sans-serif;">Disc %</th>
          <th style="padding:10px 12px;font-size:12px;color:#1a1a1a;text-align:right;font-family:Arial,Helvetica,sans-serif;">Total</th>
        </tr>
        ${lineItemRows}
      </table>

      <!-- Totals -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px 0;">
        <tr><td width="60%"></td><td width="40%">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#737373;font-family:Arial,Helvetica,sans-serif;">Subtotal:</td>
              <td style="padding:4px 0;font-size:13px;color:#1a1a1a;text-align:right;font-family:Arial,Helvetica,sans-serif;">${Number(data.quote.subtotal).toFixed(2)}</td>
            </tr>
            ${data.quote.discount > 0 ? `
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#737373;font-family:Arial,Helvetica,sans-serif;">Discount (${Number(data.quote.discountPercent).toFixed(2)}%):</td>
              <td style="padding:4px 0;font-size:13px;color:#1a1a1a;text-align:right;font-family:Arial,Helvetica,sans-serif;">-${Number(data.quote.discount).toFixed(2)}</td>
            </tr>` : ''}
            ${data.quote.taxAmount > 0 ? `
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#737373;font-family:Arial,Helvetica,sans-serif;">Tax (${Number(data.quote.taxPercent).toFixed(2)}%):</td>
              <td style="padding:4px 0;font-size:13px;color:#1a1a1a;text-align:right;font-family:Arial,Helvetica,sans-serif;">${Number(data.quote.taxAmount).toFixed(2)}</td>
            </tr>` : ''}
            ${data.quote.shippingAmount > 0 ? `
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#737373;font-family:Arial,Helvetica,sans-serif;">Shipping:</td>
              <td style="padding:4px 0;font-size:13px;color:#1a1a1a;text-align:right;font-family:Arial,Helvetica,sans-serif;">${Number(data.quote.shippingAmount).toFixed(2)}</td>
            </tr>` : ''}
            <tr style="border-top:2px solid #facc15;">
              <td style="padding:8px 0 4px 0;font-size:15px;font-weight:bold;color:#1a1a1a;font-family:Arial,Helvetica,sans-serif;">Grand Total:</td>
              <td style="padding:8px 0 4px 0;font-size:15px;font-weight:bold;color:#1a1a1a;text-align:right;font-family:Arial,Helvetica,sans-serif;">${Number(data.quote.grandTotal).toFixed(2)}</td>
            </tr>
          </table>
        </td></tr>
      </table>

      ${data.quote.paymentTerms ? `<p style="margin:0 0 8px 0;font-size:13px;color:#737373;font-family:Arial,Helvetica,sans-serif;"><strong style="color:#1a1a1a;">Payment Terms:</strong> ${this.escapeHtml(data.quote.paymentTerms)}</p>` : ''}
      ${data.quote.deliveryTerms ? `<p style="margin:0 0 8px 0;font-size:13px;color:#737373;font-family:Arial,Helvetica,sans-serif;"><strong style="color:#1a1a1a;">Delivery Terms:</strong> ${this.escapeHtml(data.quote.deliveryTerms)}</p>` : ''}
      ${data.quote.notes ? `<p style="margin:0 0 24px 0;font-size:13px;color:#737373;font-family:Arial,Helvetica,sans-serif;"><strong style="color:#1a1a1a;">Notes:</strong> ${this.escapeHtml(data.quote.notes)}</p>` : ''}

      <!-- PDF Download Button -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding:24px 0;">
            <a href="${data.quote.pdfUrl}" style="display:inline-block;background-color:#facc15;color:#1a1a1a;padding:14px 36px;text-decoration:none;font-weight:bold;font-size:16px;font-family:Arial,Helvetica,sans-serif;border:2px solid #eab308;">Download Quote PDF</a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:14px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Best regards,<br><strong style="color:#1a1a1a;">KPT Team</strong></p>
    `;

    const html = this.generateBrandedEmailTemplate(`Quote ${data.quote.quoteNumber}`, content, false);
    return this.sendEmail({
      to: data.to,
      subject,
      html,
      cc: data.cc,
      bcc: data.bcc,
    });
  }

  /**
   * Send login OTP email (Email OTP authentication)
   * KPT Partner Portal branded — blue theme, 10-minute expiry
   */
  async sendLoginOtpEmail(email: string, name: string, otp: string): Promise<boolean> {
    const subject = 'Your KPT Partner Portal verification code';

    const content = `
      <h1 style="margin:0 0 24px 0;font-size:28px;font-weight:bold;color:#3b82f6;text-align:center;font-family:Arial,Helvetica,sans-serif;">Your KPT Partner Portal verification code</h1>

      <p style="margin:0 0 16px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Hi ${name ? `<strong style="color:#1a1a1a;">${this.escapeHtml(name)}</strong>` : 'there'},</p>

      <p style="margin:0 0 30px 0;font-size:16px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Use the code below to sign in to the KPT Partner Portal. This code expires in <strong>10 minutes</strong>.</p>

      <!-- OTP Box -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#dbeafe;border:3px solid #3b82f6;margin:30px 0;">
        <tr><td style="padding:4px;background-color:#3b82f6;"></td></tr>
        <tr>
          <td align="center" style="padding:40px 30px;">
            <p style="margin:0 0 12px 0;font-size:14px;color:#737373;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">Your one-time verification code:</p>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:'Courier New',monospace;font-size:42px;font-weight:bold;letter-spacing:12px;color:#1a1a1a;background-color:#ffffff;padding:24px 40px;border:2px solid #3b82f6;">${this.escapeHtml(otp)}</td>
              </tr>
            </table>
            <p style="margin:20px 0 0 0;font-size:13px;color:#737373;font-weight:600;font-family:Arial,Helvetica,sans-serif;">Expires in 10 minutes</p>
          </td>
        </tr>
      </table>

      <!-- Security Notice -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f9f9f9;border-left:4px solid #3b82f6;margin:30px 0;">
        <tr>
          <td style="padding:20px 24px;">
            <ul style="margin:0;padding-left:20px;color:#737373;font-size:14px;line-height:1.8;">
              <li>Never share this code with anyone, including KPT staff.</li>
              <li>If you did not request this code, you can safely ignore this email.</li>
            </ul>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:14px;color:#737373;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">Best regards,<br><strong style="color:#1a1a1a;">KPT Partner Portal Team</strong></p>
    `;

    const html = this.generateBrandedEmailTemplate('KPT Login Verification Code', content, true);
    const text = [
      `KPT Partner Portal — Login Verification Code`,
      ``,
      `Hi ${name || 'there'},`,
      ``,
      `Your one-time login code is:`,
      ``,
      `  ${otp}`,
      ``,
      `This code expires in 10 minutes.`,
      ``,
      `Never share this code with anyone, including KPT staff.`,
      `If you did not request this code, you can safely ignore this email.`,
      ``,
      `— KPT Partner Portal Team`,
    ].join('\n');
    return this.sendEmail({ to: email, subject, html, text });
  }
}

// Export singleton instance
export const emailService = new EmailService();
