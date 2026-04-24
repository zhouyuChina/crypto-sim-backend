import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Send verification code email (English content)
   */
  async sendVerificationCode(
    email: string,
    code: string,
    type: string,
  ): Promise<void> {
    const appName = this.configService.get('email.defaults.from.name');
    const expiresIn = Math.floor(
      this.configService.get('email.verification.expiresIn') / 60,
    ); // seconds → minutes

    // Per-type subject / title / greeting
    const subjectMap: Record<string, string> = {
      REGISTER: 'Verify Your Email',
      RESET_PASSWORD: 'Reset Your Password',
      CHANGE_EMAIL: 'Confirm Email Change',
      SECURITY: 'Security Verification',
    };

    const titleMap: Record<string, string> = {
      REGISTER: 'Welcome! Please verify your email',
      RESET_PASSWORD: 'Reset your password',
      CHANGE_EMAIL: 'Confirm your new email address',
      SECURITY: 'Security verification required',
    };

    const greetingMap: Record<string, string> = {
      REGISTER: 'Thank you for signing up. Use the code below to complete your registration.',
      RESET_PASSWORD: 'We received a request to reset your password. Use the code below to continue.',
      CHANGE_EMAIL: 'You are changing the email address on your account. Use the code below to confirm.',
      SECURITY: 'You are performing a sensitive action. Use the code below to verify your identity.',
    };

    const subjectText = subjectMap[type] || 'Verification Code';
    const title = titleMap[type] || 'Email verification';
    const greeting = greetingMap[type] || 'You are performing an email verification.';

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `[${appName}] ${subjectText}`,
        template: 'verification-code',
        context: {
          appName,
          title,
          greeting,
          code,
          expiresIn,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Verification email sent to ${email} (type: ${type})`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to send verification email: ${errorMessage}`, errorStack);
      throw new Error('Failed to send verification email, please try again later.');
    }
  }
}
