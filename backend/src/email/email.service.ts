import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { ContactSupportStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

interface ContactSupportInput {
  email: string;
  subject: string;
  message: string;
  ipAddress?: string;
  userAgent?: string;
}

const CONTACT_SUPPORT_RECIPIENT = 'zenvy.us.support@gmail.com';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
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

  async sendContactSupportMessage(
    input: ContactSupportInput,
  ): Promise<{ message: string }> {
    let recordId: string;

    try {
      const record = await this.prisma.contactSupportMessage.create({
        data: {
          email: input.email,
          subject: input.subject,
          message: input.message,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
        select: { id: true },
      });
      recordId = record.id;
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      this.logger.error(`Failed to record contact support message: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to send email');
    }

    try {
      await this.mailerService.sendMail({
        to: CONTACT_SUPPORT_RECIPIENT,
        replyTo: input.email,
        subject: `[Zenvy 聯繫客服] ${input.subject}`,
        text: this.buildContactSupportText(input),
      });
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      try {
        await this.prisma.contactSupportMessage.update({
          where: { id: recordId },
          data: {
            status: ContactSupportStatus.FAILED,
            errorMessage: errorMessage.slice(0, 1000),
          },
        });
      } catch (updateError) {
        this.logger.error(
          `Failed to mark contact support message as failed: ${this.getErrorMessage(updateError)}`,
        );
      }

      this.logger.error(`Failed to send contact support email: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException('Failed to send email');
    }

    try {
      await this.prisma.contactSupportMessage.update({
        where: { id: recordId },
        data: {
          status: ContactSupportStatus.SENT,
          sentAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Contact support email was sent but status update failed: id=${recordId}, error=${this.getErrorMessage(error)}`,
      );
    }

    this.logger.log(
      `Contact support email sent: id=${recordId}, email=${this.maskEmail(input.email)}, subject=${input.subject.slice(0, 50)}`,
    );

    return {
      message: 'Your message has been sent successfully.',
    };
  }

  private buildContactSupportText(input: ContactSupportInput): string {
    const lines = [
      '使用者透過官網「聯繫客服」表單送出訊息。',
      '',
      `聯絡郵件：${input.email}`,
      `主旨：${input.subject}`,
      '',
      '────────────────────────',
      input.message,
      '────────────────────────',
      '',
      `送出時間：${new Date().toISOString()}`,
    ];

    if (input.ipAddress) {
      lines.push(`來源 IP：${input.ipAddress}`);
    }
    if (input.userAgent) {
      lines.push(`User-Agent：${input.userAgent}`);
    }

    return lines.join('\n');
  }

  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    if (!name || !domain) {
      return email;
    }
    return `${name.slice(0, 2)}***@${domain}`;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
