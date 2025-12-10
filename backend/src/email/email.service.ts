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
   * 发送验证码邮件
   */
  async sendVerificationCode(
    email: string,
    code: string,
    type: string,
  ): Promise<void> {
    const appName = this.configService.get('email.defaults.from.name');
    const expiresIn = Math.floor(
      this.configService.get('email.verification.expiresIn') / 60,
    ); // 转换为分钟

    // 根據類型設置不同的標題和問候語
    const titleMap: Record<string, string> = {
      REGISTER: '註冊驗證',
      RESET_PASSWORD: '重置密碼',
      CHANGE_EMAIL: '修改郵箱',
      SECURITY: '安全驗證',
    };

    const greetingMap: Record<string, string> = {
      REGISTER: '感謝您註冊我們的平台！',
      RESET_PASSWORD: '您正在重置密碼。',
      CHANGE_EMAIL: '您正在修改郵箱地址。',
      SECURITY: '您正在進行安全操作驗證。',
    };

    const title = titleMap[type] || '郵箱驗證';
    const greeting = greetingMap[type] || '您正在進行郵箱驗證。';

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: `【${appName}】${title}码`,
        template: 'verification-code', // 只需要模板名称，不需要完整路径
        context: {
          appName,
          title,
          greeting,
          code,
          expiresIn,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`驗證碼郵件已發送至 ${email}，類型：${type}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知錯誤';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`發送驗證碼郵件失敗: ${errorMessage}`, errorStack);
      throw new Error('發送驗證碼郵件失敗，請稍後重試');
    }
  }
}
