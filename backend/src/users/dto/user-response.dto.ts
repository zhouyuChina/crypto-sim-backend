export class UserResponseDto {
  id: string;
  email: string;
  displayName: string;
  phoneNumber: string;  // 暂时不在前端显示，但保留字段以备后用
  avatar?: string;
  idCardFront?: string;
  idCardBack?: string;
  passportPhoto?: string;
  documentType?: string;
  roles: string[];
  isActive: boolean;
  verificationStatus: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  demoBalance: number;
  realBalance: number;
  totalProfitLoss: number;
  totalTrades: number;
  winRate: number;

  constructor(user: any) {
    this.id = user.id;
    this.email = user.email;
    this.displayName = user.displayName;
    this.phoneNumber = user.phoneNumber;
    this.avatar = user.avatar;
    this.idCardFront = user.idCardFront;
    this.idCardBack = user.idCardBack;
    this.passportPhoto = user.passportPhoto;
    this.documentType = user.documentType;
    this.roles = user.roles || [];
    this.isActive = user.isActive;
    this.verificationStatus = user.verificationStatus;
    this.lastLoginAt = user.lastLoginAt;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
    this.demoBalance = user.demoBalance;
    this.realBalance = user.realBalance;
    this.totalProfitLoss = user.totalProfitLoss;
    this.totalTrades = user.totalTrades;
    this.winRate = user.winRate;
  }
}

export class PaginatedUsersResponseDto {
  data: UserResponseDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;

  constructor(users: any[], total: number, page: number, pageSize: number) {
    this.data = users.map((user) => new UserResponseDto(user));
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
    this.totalPages = Math.ceil(total / pageSize);
  }
}
