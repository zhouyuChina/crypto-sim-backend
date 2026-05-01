import type { Role } from '../../common/decorators/roles.decorator';

export interface UserEntity {
  id: string;
  email: string;
  displayName: string;
  passwordHash?: string; // 可选字段，因为 sanitizeUser 会移除它
  roles: Role[];
  isActive: boolean;
  lastLoginAt: Date | null;
  lastLoginIp: string | null;  // 最后登录IP地址
  avatar?: string | null;      // 用户头像 URL
  idCardFront?: string | null;  // 身份证正面照片 URL
  idCardBack?: string | null;   // 身份证反面照片 URL
  passportPhoto?: string | null; // 护照照片 URL
  documentType?: string | null;  // 当前提交的证件类型：id_card | passport
  tradeDurations: number[];      // 可选交易秒数（已规范化为默认值兜底）
  createdAt: Date;
  updatedAt: Date;

  // 用户基本信息
  phoneNumber: string | null;  // 可选，临时修改

  // 交易相关字段
  accountBalance: number;  // 旧字段，保留兼容性
  demoBalance: number;     // 虚拟交易账户余额
  realBalance: number;     // 真实交易账户余额
  totalProfitLoss: number;
  winRate: number;
  totalTrades: number;
  verificationStatus: 'PENDING' | 'IN_REVIEW' | 'VERIFIED' | 'REJECTED';
}
