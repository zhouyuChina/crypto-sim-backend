import { Body, Controller, Get, Post, Put, Patch, Param, Query, Request, UseGuards, Ip, UseInterceptors, UploadedFile, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Request as ExpressRequest } from 'express';

import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdatePhoneDto } from './dto/update-phone.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UploadIdCardDto, IdCardType } from './dto/upload-id-card.dto';
import { UploadAvatarDto } from './dto/upload-avatar.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import type { UserEntity } from './entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req: { user: UserEntity }, @Ip() ip: string) {
    return this.authService.login(req.user, ip);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  profile(@CurrentUser() user: UserEntity) {
    return user;
  }

  @Public()
  @Patch('phone/:userId')
  async updatePhone(
    @Param('userId') userId: string,
    @Body() updatePhoneDto: UpdatePhoneDto
  ) {
    const updatedUser = await this.authService.updatePhoneNumber(userId, updatePhoneDto.phoneNumber);
    return {
      message: '手机号更新成功',
      user: updatedUser,
    };
  }

  @Public()
  @Put('profile/:userId')
  async updateProfile(
    @Param('userId') userId: string,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    const updatedUser = await this.authService.updateProfile(userId, updateProfileDto);
    return {
      message: '个人资料更新成功',
      user: updatedUser,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: UserEntity) {
    await this.authService.revokeTokens(user.id);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-id-card')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: join(__dirname, '..', 'uploads', 'id-cards'),
      filename: (req, file, callback) => {
        const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
        callback(null, uniqueName);
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return callback(new Error('Only image files are allowed!'), false);
      }
      callback(null, true);
    },
  }))
  async uploadIdCard(
    @CurrentUser() user: UserEntity,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadIdCardDto,
    @Request() req: ExpressRequest,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const protocolHeader = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0];
    const protocol = protocolHeader || req.protocol || 'http';
    const host = req.get('host') ?? 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    const fileUrl = `${baseUrl}/uploads/id-cards/${file.filename}`;
    const updatedUser = await this.authService.uploadIdCard(user.id, dto.type, fileUrl, user.verificationStatus);

    return {
      message: 'ID card uploaded successfully',
      user: updatedUser,
      fileUrl,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('password')
  async changePassword(
    @CurrentUser() user: UserEntity,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      user.id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );

    return {
      message: '密码修改成功',
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: join(__dirname, '..', 'uploads', 'avatars'),
      filename: (req, file, callback) => {
        const uniqueName = `avatar-${uuidv4()}${extname(file.originalname)}`;
        callback(null, uniqueName);
      },
    }),
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
    },
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return callback(new Error('Only image files are allowed!'), false);
      }
      callback(null, true);
    },
  }))
  async uploadAvatar(
    @CurrentUser() user: UserEntity,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadAvatarDto,
    @Request() req: ExpressRequest,
    @Param('userId') userId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('请上传头像文件');
    }

    // 确定要上传头像的用户ID
    const targetUserId = userId || user.id;

    // 如果不是当前用户，则需要管理员权限
    if (targetUserId !== user.id) {
      // 检查用户是否为管理员
      const hasAdminRole = user.roles.some(role => role === 'admin');
      if (!hasAdminRole) {
        throw new UnauthorizedException('您没有权限为该用户上传头像');
      }
    }

    const protocolHeader = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0];
    const protocol = protocolHeader || req.protocol || 'http';
    const host = req.get('host') ?? 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    const fileUrl = `${baseUrl}/uploads/avatars/${file.filename}`;

    const updatedUser = await this.authService.updateAvatar(targetUserId, fileUrl);

    return {
      message: '头像上传成功',
      user: updatedUser,
      fileUrl,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('upload-avatar/:userId')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: join(__dirname, '..', 'uploads', 'avatars'),
      filename: (req, file, callback) => {
        const uniqueName = `avatar-${uuidv4()}${extname(file.originalname)}`;
        callback(null, uniqueName);
      },
    }),
    limits: {
      fileSize: 2 * 1024 * 1024, // 2MB
    },
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        return callback(new Error('Only image files are allowed!'), false);
      }
      callback(null, true);
    },
  }))
  async uploadAvatarWithUserId(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: UserEntity,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadAvatarDto,
    @Request() req: ExpressRequest,
  ) {
    if (!file) {
      throw new BadRequestException('请上传头像文件');
    }

    // 只有自己或管理员能为用户上传头像
    if (userId !== currentUser.id) {
      // 检查是否为管理员（为了支持管理员为用户上传头像）
      const hasAdminRole = currentUser.roles.some(role => role === 'admin');
      if (!hasAdminRole) {
        throw new UnauthorizedException('您没有权限为该用户上传头像');
      }
    }

    const protocolHeader = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0];
    const protocol = protocolHeader || req.protocol || 'http';
    const host = req.get('host') ?? 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    const fileUrl = `${baseUrl}/uploads/avatars/${file.filename}`;

    const updatedUser = await this.authService.updateAvatar(userId, fileUrl);

    return {
      message: '头像上传成功',
      user: updatedUser,
      fileUrl,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

}
