import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { PaginatedUsersResponseDto, UserResponseDto } from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { AdjustBalanceDto, BalanceType, AdjustmentType } from './dto/adjust-balance.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';

import { BusinessException } from '../common/exceptions/business.exception';
import { generateUniqueUserId } from '../common/utils/user-id.generator';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly saltRounds = 12;
  private readonly supportedVerificationStatuses = ['PENDING', 'IN_REVIEW', 'VERIFIED', 'REJECTED'];

  constructor(private readonly prisma: PrismaService) {}

  async createCustomUser(createUserDto: CreateUserDto, createdBy: string): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new BusinessException(
        HttpStatus.CONFLICT,
        'EMAIL_ALREADY_EXISTS',
        '该邮箱已被注册'
      );
    }

    if (!this.supportedVerificationStatuses.includes(createUserDto.verificationStatus)) {
      throw new BusinessException(
        HttpStatus.BAD_REQUEST,
        'INVALID_VERIFICATION_STATUS',
        '不支持的实名认证状态'
      );
    }

    const passwordHash = await bcrypt.hash(createUserDto.password, this.saltRounds);
    const id = await generateUniqueUserId(this.prisma);

    const createdUser = await this.prisma.user.create({
      data: {
        id,
        email: createUserDto.email,
        passwordHash,
        displayName: createUserDto.displayName,
        phoneNumber: createUserDto.phoneNumber,
        avatar: createUserDto.avatar,
        idCardFront: createUserDto.idCardFront,
        idCardBack: createUserDto.idCardBack,
        demoBalance: new Decimal(createUserDto.demoBalance),
        realBalance: new Decimal(createUserDto.realBalance),
        verificationStatus: createUserDto.verificationStatus as any,
        roles: ['trader'],
        isCustomMember: true,
        createdBy,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        phoneNumber: true,
        avatar: true,
        idCardFront: true,
        idCardBack: true,
          passportPhoto: true,
          documentType: true,
          tradeDurations: true,
        roles: true,
        isActive: true,
        verificationStatus: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        demoBalance: true,
        realBalance: true,
        totalProfitLoss: true,
        totalTrades: true,
        winRate: true,
      },
    });

    this.logger.log(`管理员创建自定义用户: userId=${createdUser.id}, adminId=${createdBy}`);

    return new UserResponseDto(createdUser);
  }

  async findAll(query: QueryUsersDto): Promise<PaginatedUsersResponseDto> {
    const {
      page = 1,
      pageSize = 10,
      search,
      role,
      verificationStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isActive,
    } = query;

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Prisma.UserWhereInput = {};

    // Search filter (search in email, displayName, phoneNumber)
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Role filter
    if (role) {
      where.roles = {
        array_contains: role,
      };
    }

    // Verification status filter
    if (verificationStatus) {
      where.verificationStatus = verificationStatus;
    }

    // Active status filter
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Execute queries in parallel
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          phoneNumber: true,
          avatar: true,
          idCardFront: true,
          idCardBack: true,
          passportPhoto: true,
          documentType: true,
          tradeDurations: true,
          roles: true,
          isActive: true,
          verificationStatus: true,
          lastLoginAt: true,
          lastLoginIp: true,
          createdAt: true,
          updatedAt: true,
          demoBalance: true,
          realBalance: true,
          totalProfitLoss: true,
          totalTrades: true,
          winRate: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return new PaginatedUsersResponseDto(users, total, page, pageSize);
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        displayName: true,
        phoneNumber: true,
        avatar: true,
        idCardFront: true,
        idCardBack: true,
          passportPhoto: true,
          documentType: true,
          tradeDurations: true,
        roles: true,
        isActive: true,
        verificationStatus: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        demoBalance: true,
        realBalance: true,
        totalProfitLoss: true,
        totalTrades: true,
        winRate: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return new UserResponseDto(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Check email uniqueness if updating email
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email already in use');
      }
    }

    // 手机号不需要唯一性检查，允许多个用户使用相同手机号

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        email: true,
        displayName: true,
        phoneNumber: true,
        avatar: true,
        idCardFront: true,
        idCardBack: true,
          passportPhoto: true,
          documentType: true,
          tradeDurations: true,
        roles: true,
        isActive: true,
        verificationStatus: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        demoBalance: true,
        realBalance: true,
        totalProfitLoss: true,
        totalTrades: true,
        winRate: true,
      },
    });

    return new UserResponseDto(updatedUser);
  }

  async activate(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        displayName: true,
        phoneNumber: true,
        avatar: true,
        idCardFront: true,
        idCardBack: true,
          passportPhoto: true,
          documentType: true,
          tradeDurations: true,
        roles: true,
        isActive: true,
        verificationStatus: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        demoBalance: true,
        realBalance: true,
        totalProfitLoss: true,
        totalTrades: true,
        winRate: true,
      },
    });

    return new UserResponseDto(updatedUser);
  }

  async deactivate(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        displayName: true,
        phoneNumber: true,
        avatar: true,
        idCardFront: true,
        idCardBack: true,
          passportPhoto: true,
          documentType: true,
          tradeDurations: true,
        roles: true,
        isActive: true,
        verificationStatus: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        demoBalance: true,
        realBalance: true,
        totalProfitLoss: true,
        totalTrades: true,
        winRate: true,
      },
    });

    return new UserResponseDto(updatedUser);
  }

  async updateRoles(id: string, updateRolesDto: UpdateUserRolesDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { roles: updateRolesDto.roles },
      select: {
        id: true,
        email: true,
        displayName: true,
        phoneNumber: true,
        avatar: true,
        idCardFront: true,
        idCardBack: true,
          passportPhoto: true,
          documentType: true,
          tradeDurations: true,
        roles: true,
        isActive: true,
        verificationStatus: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        demoBalance: true,
        realBalance: true,
        totalProfitLoss: true,
        totalTrades: true,
        winRate: true,
      },
    });

    return new UserResponseDto(updatedUser);
  }

  async adjustBalance(id: string, adjustBalanceDto: AdjustBalanceDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { balanceType, adjustmentType, amount } = adjustBalanceDto;

    // Determine which balance field to update
    const balanceField = balanceType === BalanceType.DEMO ? 'demoBalance' : 'realBalance';
    const currentBalance = new Decimal(user[balanceField].toString());

    let newBalance: Decimal;

    switch (adjustmentType) {
      case AdjustmentType.ADD:
        newBalance = currentBalance.add(amount);
        break;
      case AdjustmentType.SUBTRACT:
        newBalance = currentBalance.sub(amount);
        if (newBalance.isNegative()) {
          throw new BadRequestException('Balance cannot be negative');
        }
        break;
      case AdjustmentType.SET:
        if (amount < 0) {
          throw new BadRequestException('Balance cannot be negative');
        }
        newBalance = new Decimal(amount);
        break;
      default:
        throw new BadRequestException('Invalid adjustment type');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { [balanceField]: newBalance },
      select: {
        id: true,
        email: true,
        displayName: true,
        phoneNumber: true,
        avatar: true,
        idCardFront: true,
        idCardBack: true,
          passportPhoto: true,
          documentType: true,
          tradeDurations: true,
        roles: true,
        isActive: true,
        verificationStatus: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        demoBalance: true,
        realBalance: true,
        totalProfitLoss: true,
        totalTrades: true,
        winRate: true,
      },
    });

    return new UserResponseDto(updatedUser);
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: `User ${id} has been deleted successfully` };
  }

  async resetPassword(id: string, newPassword: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // 哈希新密码
    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);

    // 更新密码
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
      select: {
        id: true,
        email: true,
        displayName: true,
        phoneNumber: true,
        avatar: true,
        idCardFront: true,
        idCardBack: true,
          passportPhoto: true,
          documentType: true,
          tradeDurations: true,
        roles: true,
        isActive: true,
        verificationStatus: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        demoBalance: true,
        realBalance: true,
        totalProfitLoss: true,
        totalTrades: true,
        winRate: true,
      },
    });

    this.logger.log(`管理员重置用户 ${id} 的密码`);

    return new UserResponseDto(updatedUser);
  }

  async updateTradeDurations(id: string, durations: number[]): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { tradeDurations: durations },
      select: {
        id: true,
        email: true,
        displayName: true,
        phoneNumber: true,
        avatar: true,
        idCardFront: true,
        idCardBack: true,
        passportPhoto: true,
        documentType: true,
        tradeDurations: true,
        roles: true,
        isActive: true,
        verificationStatus: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        demoBalance: true,
        realBalance: true,
        totalProfitLoss: true,
        totalTrades: true,
        winRate: true,
      },
    });

    this.logger.log(`管理员更新用户 ${id} 的可选交易秒数: ${durations.join(',')}`);

    return new UserResponseDto(updatedUser);
  }
}
