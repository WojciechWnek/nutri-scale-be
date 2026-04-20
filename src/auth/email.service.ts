import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend | null = null;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn(
        'RESEND_API_KEY not found. Service running in DEV MODE.',
      );
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${this.configService.get('CORS_ORIGIN') || 'http://localhost:3000'}/verify-email?token=${token}`;
    const from =
      this.configService.get<string>('MAIL_FROM') ||
      'Nutri Scale <system@nutri-scale.wownek.pl>';

    if (!this.resend) {
      this.logger.log(
        `[DEV MODE] Verification email for ${email}: URL: ${verificationUrl}`,
      );
      return;
    }

    const { error } = await this.resend.emails.send({
      from: from,
      to: [email],
      subject: 'Verify your email address',
      html: `
        <h1>Email Verification</h1>
        <p>Thank you for signing up! Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}">${verificationUrl}</a>
        <p>This link will expire in 24 hours.</p>
      `,
    });

    if (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      return;
    }

    this.logger.log(`Verification email sent to ${email}`);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.configService.get('FRONTEND_URL') || 'http://localhost:3000'}/reset-password?token=${token}`;
    const from =
      this.configService.get<string>('MAIL_FROM') ||
      'Nutri Scale <system@nutri-scale.wownek.pl>';

    if (!this.resend) {
      this.logger.log(
        `[DEV MODE] Password reset email for ${email}: URL: ${resetUrl}`,
      );
      return;
    }

    const { error } = await this.resend.emails.send({
      from: from,
      to: [email],
      subject: 'Reset your password',
      html: `
        <h1>Password Reset</h1>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetUrl}">${resetUrl}</a>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    if (error) {
      this.logger.error(`Failed to send reset email to ${email}`, error);
      return;
    }

    this.logger.log(`Password reset email sent to ${email}`);
  }
}
