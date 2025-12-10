# 邮箱验证功能文档

## 功能概述

邮箱验证功能支持以下场景：
- 用户注册验证
- 重置密码验证
- 修改邮箱验证
- 安全操作验证

## 快速开始

### 1. 配置邮箱服务

#### 本地开发（QQ 邮箱）

1. 登录 QQ 邮箱：https://mail.qq.com
2. 进入设置 → 账户
3. 找到"POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务"
4. 开启"POP3/SMTP服务"或"IMAP/SMTP服务"
5. 发送短信验证，获取**16位授权码**

6. 在 `.env` 文件中配置：

```bash
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@qq.com
SMTP_PASS=abcdefghijklmnop  # 你的16位授权码
EMAIL_FROM=your-email@qq.com
EMAIL_FROM_NAME=加密货币交易平台
```

#### 生产环境（Gmail）

1. 登录 Google 账号：https://myaccount.google.com
2. 安全性 → 两步验证 → 应用专用密码
3. 生成应用专用密码

4. 在 `.env.production` 文件中配置：

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-service@gmail.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM=your-service@gmail.com
EMAIL_FROM_NAME=加密货币交易平台
```

### 2. 运行数据库迁移

```bash
# 生成 Prisma Client
npx prisma generate

# 应用数据库变更（开发环境）
npx prisma db push
```

### 3. 启动应用

```bash
npm run start:dev
```

## API 接口

### 1. 发送验证码

**请求**

```http
POST /api/email/send-verification-code
Content-Type: application/json

{
  "email": "user@example.com",
  "type": "REGISTER"
}
```

**type 可选值**：
- `REGISTER` - 注册验证
- `RESET_PASSWORD` - 重置密码
- `CHANGE_EMAIL` - 修改邮箱
- `SECURITY` - 安全操作

**成功响应** (200)

```json
{
  "data": {
    "message": "验证码已发送，请查收邮件",
    "expiresIn": 600
  }
}
```

**错误响应**

```json
// 频率限制 (400)
{
  "statusCode": 400,
  "message": "请求过于频繁，请在 45 秒后重试"
}

// 邮箱格式错误 (400)
{
  "statusCode": 400,
  "message": "邮箱格式不正确"
}
```

### 2. 验证验证码

**请求**

```http
POST /api/email/verify-code
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "type": "REGISTER"
}
```

**成功响应** (200)

```json
{
  "data": {
    "success": true,
    "message": "验证成功"
  }
}
```

**错误响应**

```json
// 验证码无效 (400)
{
  "statusCode": 400,
  "message": "验证码无效或已使用"
}

// 验证码过期 (400)
{
  "statusCode": 400,
  "message": "验证码已过期，请重新获取"
}

// 验证失败次数过多 (400)
{
  "statusCode": 400,
  "message": "验证失败次数过多，请重新获取验证码"
}
```

## 前端集成示例

### TypeScript 类型定义

```typescript
// 验证类型枚举
export enum EmailVerificationType {
  REGISTER = 'REGISTER',
  RESET_PASSWORD = 'RESET_PASSWORD',
  CHANGE_EMAIL = 'CHANGE_EMAIL',
  SECURITY = 'SECURITY',
}

// 发送验证码请求
export interface SendVerificationCodeRequest {
  email: string;
  type: EmailVerificationType;
}

// 发送验证码响应
export interface SendVerificationCodeResponse {
  data: {
    message: string;
    expiresIn: number; // 秒
  };
}

// 验证验证码请求
export interface VerifyCodeRequest {
  email: string;
  code: string;
  type: EmailVerificationType;
}

// 验证验证码响应
export interface VerifyCodeResponse {
  data: {
    success: boolean;
    message: string;
  };
}

// 错误响应
export interface ErrorResponse {
  statusCode: number;
  message: string;
  error?: string;
}
```

### 基础 API 封装

```typescript
// api/email.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// 发送验证码
export async function sendVerificationCode(
  email: string,
  type: EmailVerificationType = EmailVerificationType.REGISTER
): Promise<SendVerificationCodeResponse> {
  const response = await axios.post<SendVerificationCodeResponse>(
    `${API_BASE_URL}/email/send-verification-code`,
    { email, type }
  );
  return response.data;
}

// 验证验证码
export async function verifyCode(
  email: string,
  code: string,
  type: EmailVerificationType = EmailVerificationType.REGISTER
): Promise<VerifyCodeResponse> {
  const response = await axios.post<VerifyCodeResponse>(
    `${API_BASE_URL}/email/verify-code`,
    { email, code, type }
  );
  return response.data;
}
```

### React Hook 示例

```typescript
// hooks/useEmailVerification.ts
import { useState, useCallback, useEffect } from 'react';
import { sendVerificationCode, verifyCode, EmailVerificationType } from '@/api/email';

export function useEmailVerification(type: EmailVerificationType = EmailVerificationType.REGISTER) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [verifying, setVerifying] = useState(false);

  // 倒计时逻辑
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 发送验证码
  const sendCode = useCallback(async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await sendVerificationCode(email, type);

      // 启动60秒倒计时
      setCountdown(60);

      return {
        success: true,
        message: response.data.message,
        expiresIn: response.data.expiresIn,
      };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || '发送验证码失败';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, [type]);

  // 验证验证码
  const verify = useCallback(async (email: string, code: string) => {
    try {
      setVerifying(true);
      setError(null);

      const response = await verifyCode(email, code, type);

      return {
        success: response.data.success,
        message: response.data.message,
      };
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || '验证失败';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setVerifying(false);
    }
  }, [type]);

  return {
    sendCode,
    verify,
    loading,
    verifying,
    error,
    countdown,
    canResend: countdown === 0,
  };
}
```

### React 组件示例

```tsx
// components/EmailVerificationForm.tsx
import React, { useState } from 'react';
import { useEmailVerification } from '@/hooks/useEmailVerification';
import { EmailVerificationType } from '@/api/email';

export function EmailVerificationForm() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'input-email' | 'input-code'>('input-email');

  const {
    sendCode,
    verify,
    loading,
    verifying,
    error,
    countdown,
    canResend,
  } = useEmailVerification(EmailVerificationType.REGISTER);

  const handleSendCode = async () => {
    if (!email) {
      alert('请输入邮箱地址');
      return;
    }

    const result = await sendCode(email);
    if (result.success) {
      alert('验证码已发送，请查收邮件');
      setStep('input-code');
    } else {
      alert(result.message);
    }
  };

  const handleVerify = async () => {
    if (!code) {
      alert('请输入验证码');
      return;
    }

    const result = await verify(email, code);
    if (result.success) {
      alert('验证成功！');
      // 继续后续流程...
    } else {
      alert(result.message);
    }
  };

  return (
    <div className="email-verification-form">
      {step === 'input-email' && (
        <div>
          <h2>邮箱验证</h2>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="请输入邮箱地址"
          />
          <button onClick={handleSendCode} disabled={loading}>
            {loading ? '发送中...' : '发送验证码'}
          </button>
        </div>
      )}

      {step === 'input-code' && (
        <div>
          <h2>输入验证码</h2>
          <p>验证码已发送至: {email}</p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="请输入6位验证码"
            maxLength={6}
          />
          <button onClick={handleVerify} disabled={verifying}>
            {verifying ? '验证中...' : '验证'}
          </button>
          <button onClick={handleSendCode} disabled={!canResend || loading}>
            {countdown > 0 ? `重新发送 (${countdown}s)` : '重新发送'}
          </button>
          <button onClick={() => setStep('input-email')}>
            修改邮箱
          </button>
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### Vue 3 组合式 API 示例

```vue
<template>
  <div class="email-verification-form">
    <div v-if="step === 'input-email'">
      <h2>邮箱验证</h2>
      <input
        v-model="email"
        type="email"
        placeholder="请输入邮箱地址"
      />
      <button @click="handleSendCode" :disabled="loading">
        {{ loading ? '发送中...' : '发送验证码' }}
      </button>
    </div>

    <div v-else-if="step === 'input-code'">
      <h2>输入验证码</h2>
      <p>验证码已发送至: {{ email }}</p>
      <input
        v-model="code"
        type="text"
        placeholder="请输入6位验证码"
        maxlength="6"
      />
      <button @click="handleVerify" :disabled="verifying">
        {{ verifying ? '验证中...' : '验证' }}
      </button>
      <button @click="handleSendCode" :disabled="!canResend || loading">
        {{ countdown > 0 ? `重新发送 (${countdown}s)` : '重新发送' }}
      </button>
      <button @click="step = 'input-email'">修改邮箱</button>
    </div>

    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { sendVerificationCode, verifyCode, EmailVerificationType } from '@/api/email';
import { useCountdown } from '@/composables/useCountdown';

const email = ref('');
const code = ref('');
const step = ref<'input-email' | 'input-code'>('input-email');
const loading = ref(false);
const verifying = ref(false);
const error = ref<string | null>(null);

const { countdown, start: startCountdown } = useCountdown();
const canResend = computed(() => countdown.value === 0);

async function handleSendCode() {
  if (!email.value) {
    alert('请输入邮箱地址');
    return;
  }

  try {
    loading.value = true;
    error.value = null;

    const response = await sendVerificationCode(
      email.value,
      EmailVerificationType.REGISTER
    );

    alert('验证码已发送，请查收邮件');
    step.value = 'input-code';
    startCountdown(60);
  } catch (err: any) {
    error.value = err.response?.data?.message || '发送验证码失败';
    alert(error.value);
  } finally {
    loading.value = false;
  }
}

async function handleVerify() {
  if (!code.value) {
    alert('请输入验证码');
    return;
  }

  try {
    verifying.value = true;
    error.value = null;

    const response = await verifyCode(
      email.value,
      code.value,
      EmailVerificationType.REGISTER
    );

    alert('验证成功！');
    // 继续后续流程...
  } catch (err: any) {
    error.value = err.response?.data?.message || '验证失败';
    alert(error.value);
  } finally {
    verifying.value = false;
  }
}
</script>
```

### 原生 JavaScript / Fetch API 示例

```javascript
// 发送验证码
async function sendVerificationCode(email, type = 'REGISTER') {
  try {
    const response = await fetch('http://localhost:3000/api/email/send-verification-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, type }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    console.log('验证码已发送:', data.data);
    return data.data;
  } catch (error) {
    console.error('发送验证码失败:', error.message);
    throw error;
  }
}

// 验证验证码
async function verifyCode(email, code, type = 'REGISTER') {
  try {
    const response = await fetch('http://localhost:3000/api/email/verify-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code, type }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const data = await response.json();
    console.log('验证结果:', data.data);
    return data.data;
  } catch (error) {
    console.error('验证失败:', error.message);
    throw error;
  }
}

// 使用示例
async function handleRegister() {
  const email = document.getElementById('email').value;
  const code = document.getElementById('code').value;

  try {
    // 1. 发送验证码
    await sendVerificationCode(email, 'REGISTER');
    alert('验证码已发送，请查收邮件');

    // 2. 用户输入验证码后验证
    const result = await verifyCode(email, code, 'REGISTER');
    if (result.success) {
      alert('验证成功！');
      // 继续注册流程...
    }
  } catch (error) {
    alert(error.message);
  }
}
```

## 安全特性

### 1. 频率限制

- 同一邮箱 60 秒内只能发送一次验证码
- 防止恶意请求和邮箱轰炸

### 2. 验证码过期

- 验证码默认 10 分钟过期
- 过期后自动失效，需重新获取

### 3. 验证次数限制

- 每个验证码最多验证 5 次
- 超过次数后需重新获取验证码

### 4. 一次性使用

- 验证码验证成功后自动标记为已使用
- 防止重复使用

### 5. 自动清理

- 旧验证码在新验证码发送时自动失效
- 系统可定期清理过期记录

## 配置参数

所有配置在 `src/config/email.config.ts` 中定义：

```typescript
{
  verification: {
    codeLength: 6,          // 验证码长度
    expiresIn: 600,         // 过期时间（秒）
    resendInterval: 60,     // 重发间隔（秒）
    maxAttempts: 5,         // 最多验证次数
  }
}
```

## 常见问题

### 1. 本地测试收不到邮件？

- 检查 SMTP 配置是否正确
- 确认已开启邮箱的 SMTP 服务
- 检查授权码是否正确（16位，无空格）
- 查看应用日志中的错误信息

### 2. Gmail 发送失败？

- 确保开启了两步验证
- 使用应用专用密码，不是账号密码
- 国内环境可能需要代理

### 3. 验证码收不到？

- 检查垃圾邮件文件夹
- 确认邮箱地址正确
- 查看应用日志确认邮件是否发送成功

### 4. 生产环境如何切换邮箱服务？

只需修改 `.env.production` 文件中的 SMTP 配置即可，代码无需改动。

## 邮件模板自定义

邮件模板位于 `src/email/templates/verification-code.hbs`，使用 Handlebars 模板引擎。

可用变量：
- `{{appName}}` - 应用名称
- `{{title}}` - 邮件标题
- `{{greeting}}` - 问候语
- `{{code}}` - 验证码
- `{{expiresIn}}` - 过期时间（分钟）
- `{{year}}` - 当前年份

## 完整使用场景

### 场景1: 用户注册流程

```typescript
// 完整的注册流程示例
import { sendVerificationCode, verifyCode, EmailVerificationType } from '@/api/email';
import { register } from '@/api/auth';

async function handleUserRegistration(
  email: string,
  password: string,
  verificationCode: string
) {
  try {
    // 步骤1: 发送验证码（用户点击"发送验证码"按钮）
    const sendResult = await sendVerificationCode(
      email,
      EmailVerificationType.REGISTER
    );
    console.log('验证码已发送，有效期:', sendResult.data.expiresIn, '秒');

    // 步骤2: 用户输入验证码后，验证验证码
    const verifyResult = await verifyCode(
      email,
      verificationCode,
      EmailVerificationType.REGISTER
    );

    if (!verifyResult.data.success) {
      throw new Error('验证码验证失败');
    }

    // 步骤3: 验证成功后，调用注册接口
    const registerResult = await register({
      email,
      password,
      displayName: email.split('@')[0], // 使用邮箱前缀作为显示名称
    });

    console.log('注册成功:', registerResult);
    return registerResult;
  } catch (error) {
    console.error('注册失败:', error);
    throw error;
  }
}
```

### 场景2: 重置密码流程

```typescript
import { sendVerificationCode, verifyCode, EmailVerificationType } from '@/api/email';
import { resetPassword } from '@/api/auth';

async function handlePasswordReset(
  email: string,
  verificationCode: string,
  newPassword: string
) {
  try {
    // 步骤1: 发送重置密码验证码
    await sendVerificationCode(email, EmailVerificationType.RESET_PASSWORD);

    // 步骤2: 验证验证码
    const verifyResult = await verifyCode(
      email,
      verificationCode,
      EmailVerificationType.RESET_PASSWORD
    );

    if (!verifyResult.data.success) {
      throw new Error('验证码验证失败');
    }

    // 步骤3: 重置密码
    await resetPassword(email, newPassword);

    console.log('密码重置成功');
  } catch (error) {
    console.error('密码重置失败:', error);
    throw error;
  }
}
```

### 场景3: 修改邮箱流程

```typescript
import { sendVerificationCode, verifyCode, EmailVerificationType } from '@/api/email';
import { updateEmail } from '@/api/user';

async function handleEmailChange(
  oldEmail: string,
  newEmail: string,
  verificationCode: string,
  token: string // 用户的JWT token
) {
  try {
    // 步骤1: 向新邮箱发送验证码
    await sendVerificationCode(newEmail, EmailVerificationType.CHANGE_EMAIL);

    // 步骤2: 验证新邮箱的验证码
    const verifyResult = await verifyCode(
      newEmail,
      verificationCode,
      EmailVerificationType.CHANGE_EMAIL
    );

    if (!verifyResult.data.success) {
      throw new Error('验证码验证失败');
    }

    // 步骤3: 更新邮箱
    await updateEmail(newEmail, token);

    console.log('邮箱修改成功');
  } catch (error) {
    console.error('邮箱修改失败:', error);
    throw error;
  }
}
```

## curl 测试命令

### 1. 测试发送验证码

```bash
# 注册验证
curl -X POST http://localhost:3000/api/email/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"REGISTER"}'

# 重置密码验证
curl -X POST http://localhost:3000/api/email/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"RESET_PASSWORD"}'
```

### 2. 测试验证验证码

```bash
curl -X POST http://localhost:3000/api/email/verify-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456","type":"REGISTER"}'
```

### 3. 测试频率限制

```bash
# 连续发送两次请求，第二次应该返回频率限制错误
curl -X POST http://localhost:3000/api/email/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"REGISTER"}'

# 立即再次发送（应该失败）
curl -X POST http://localhost:3000/api/email/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","type":"REGISTER"}'
```

## Postman 测试集合

您可以导入以下 JSON 到 Postman 进行测试：

```json
{
  "info": {
    "name": "Email Verification API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "发送验证码 - 注册",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"{{test_email}}\",\n  \"type\": \"REGISTER\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/email/send-verification-code",
          "host": ["{{base_url}}"],
          "path": ["api", "email", "send-verification-code"]
        }
      }
    },
    {
      "name": "验证验证码",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"{{test_email}}\",\n  \"code\": \"{{verification_code}}\",\n  \"type\": \"REGISTER\"\n}"
        },
        "url": {
          "raw": "{{base_url}}/api/email/verify-code",
          "host": ["{{base_url}}"],
          "path": ["api", "email", "verify-code"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3000"
    },
    {
      "key": "test_email",
      "value": "test@example.com"
    },
    {
      "key": "verification_code",
      "value": ""
    }
  ]
}
```

## 技术栈

- NestJS
- Nodemailer
- @nestjs-modules/mailer
- Handlebars
- Prisma
- PostgreSQL

## 相关文档

- [NestJS Mailer 文档](https://nest-modules.github.io/mailer/)
- [Nodemailer 文档](https://nodemailer.com/)
- [Handlebars 文档](https://handlebarsjs.com/)
- [Prisma 文档](https://www.prisma.io/docs)

## 许可证

MIT
