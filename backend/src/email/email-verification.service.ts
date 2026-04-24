import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';

import { EmailVerificationType } from './dto/send-verification-code.dto';
import { EmailService } from './email.service';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  // 用於記錄發送頻率的 Map（簡單實現，生產環境建議使用 Redis）
  private readonly sendTimestamps = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 生成6位隨機數字驗證碼
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 檢查發送頻率限制
   */
  private checkSendFrequency(email: string, type: string): void {
    const key = `${email}:${type}`;
    const lastSendTime = this.sendTimestamps.get(key);
    const resendInterval = this.configService.get(
      'email.verification.resendInterval',
    );

    if (lastSendTime) {
      const elapsed = Date.now() - lastSendTime;
      if (elapsed < resendInterval * 1000) {
        const remainingSeconds = Math.ceil(
          (resendInterval * 1000 - elapsed) / 1000,
        );
        throw new BadRequestException(
          `請求過於頻繁，請在 ${remainingSeconds} 秒後重試`,
        );
      }
    }
  }

  /**
   * 更新發送時間戳
   */
  private updateSendTimestamp(email: string, type: string): void {
    const key = `${email}:${type}`;
    this.sendTimestamps.set(key, Date.now());

    // 定期清理過期的時間戳（1小時後）
    setTimeout(() => {
      this.sendTimestamps.delete(key);
    }, 3600000);
  }

  /**
   * 發送驗證碼
   */
  async sendVerificationCode(
    email: string,
    type: EmailVerificationType,
  ): Promise<{ message: string; expiresIn: number }> {
    // 針對不同類型做前置業務校驗，避免無意義的郵件發送
    if (type === EmailVerificationType.REGISTER) {
      const existing = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing) {
        throw new BadRequestException('該郵箱已被註冊，請直接登入');
      }
    }

    // 檢查發送頻率
    this.checkSendFrequency(email, type);

    // 生成驗證碼
    const code = this.generateVerificationCode();

    // 計算過期時間
    const expiresIn = this.configService.get('email.verification.expiresIn');
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // 將之前未使用的驗證碼標記為已使用（避免舊驗證碼依然有效）
    await this.prisma.emailVerification.updateMany({
      where: {
        email,
        type,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // 保存驗證碼到數據庫
    await this.prisma.emailVerification.create({
      data: {
        email,
        code,
        type,
        expiresAt,
      },
    });

    // 發送郵件
    await this.emailService.sendVerificationCode(email, code, type);

    // 更新發送時間戳
    this.updateSendTimestamp(email, type);

    this.logger.log(`驗證碼已發送至 ${email}，類型：${type}`);

    return {
      message: '驗證碼已發送，請查收郵件',
      expiresIn,
    };
  }

  /**
   * 驗證驗證碼
   */
  async verifyCode(
    email: string,
    code: string,
    type: EmailVerificationType,
  ): Promise<{ success: boolean; message: string }> {
    // 查找驗證碼記錄
    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        email,
        code,
        type,
        used: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 驗證碼不存在
    if (!verification) {
      throw new BadRequestException('驗證碼無效或已使用');
    }

    // 檢查是否過期
    if (new Date() > verification.expiresAt) {
      throw new BadRequestException('驗證碼已過期，請重新獲取');
    }

    // 檢查驗證嘗試次數
    const maxAttempts = this.configService.get(
      'email.verification.maxAttempts',
    );
    if (verification.attempts >= maxAttempts) {
      throw new BadRequestException('驗證失敗次數過多，請重新獲取驗證碼');
    }

    // 驗證成功，標記為已使用
    await this.prisma.emailVerification.update({
      where: { id: verification.id },
      data: {
        used: true,
      },
    });

    this.logger.log(`驗證碼驗證成功：${email}，類型：${type}`);

    return {
      success: true,
      message: '驗證成功',
    };
  }

  /**
   * 記錄驗證失敗（增加嘗試次數）
   */
  async recordFailedAttempt(
    email: string,
    code: string,
    type: EmailVerificationType,
  ): Promise<void> {
    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        email,
        code,
        type,
        used: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (verification) {
      await this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: {
          attempts: verification.attempts + 1,
        },
      });
    }
  }

  /**
   * 清理過期的驗證碼（可以通過定時任務調用）
   */
  async cleanupExpiredCodes(): Promise<number> {
    const result = await this.prisma.emailVerification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`已清理 ${result.count} 條過期的驗證碼記錄`);

    return result.count;
  }
}
