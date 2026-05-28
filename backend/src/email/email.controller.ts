import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

import { Public } from '../common/decorators/public.decorator';

import { ContactSupportDto } from './dto/contact-support.dto';
import { SendVerificationCodeDto } from './dto/send-verification-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { EmailVerificationService } from './email-verification.service';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(
    private readonly emailVerificationService: EmailVerificationService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * 发送验证码
   */
  @Public()
  @Post('send-verification-code')
  async sendVerificationCode(@Body() dto: SendVerificationCodeDto) {
    return this.emailVerificationService.sendVerificationCode(
      dto.email,
      dto.type,
    );
  }

  /**
   * 验证验证码
   */
  @Public()
  @Post('verify-code')
  async verifyCode(@Body() dto: VerifyCodeDto) {
    try {
      return await this.emailVerificationService.verifyCode(
        dto.email,
        dto.code,
        dto.type,
      );
    } catch (error) {
      // 记录验证失败
      await this.emailVerificationService.recordFailedAttempt(
        dto.email,
        dto.code,
        dto.type,
      );
      throw error;
    }
  }

  /**
   * 未登录用户提交联系客服表单
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @Post('contact-support')
  async contactSupport(@Body() dto: ContactSupportDto, @Req() req: Request) {
    return this.emailService.sendContactSupportMessage({
      email: dto.email,
      subject: dto.subject,
      message: dto.message,
      ipAddress: req.ip?.replace(/^::ffff:/, ''),
      userAgent: req.get('user-agent'),
    });
  }
}
