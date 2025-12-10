import { Controller, Post, Body } from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator';

import { SendVerificationCodeDto } from './dto/send-verification-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { EmailVerificationService } from './email-verification.service';

@Controller('email')
export class EmailController {
  constructor(
    private readonly emailVerificationService: EmailVerificationService,
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
}
