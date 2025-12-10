import { registerAs } from '@nestjs/config';

export default registerAs('email', () => {
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';

  return {
    transport: {
      host: process.env.SMTP_HOST || 'smtp.qq.com',
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // 163邮箱和其他邮箱的TLS配置
      tls: {
        // 不验证证书（某些邮箱服务器需要）
        rejectUnauthorized: false,
      },
      // 连接超时设置
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    },
    defaults: {
      from: {
        name: process.env.EMAIL_FROM_NAME || '加密货币交易平台',
        address: process.env.EMAIL_FROM || process.env.SMTP_USER,
      },
    },
    verification: {
      codeLength: 6,
      expiresIn: 600, // 10分钟（秒）
      resendInterval: 60, // 60秒后才能重新发送
      maxAttempts: 5, // 最多验证5次
    },
  };
});
