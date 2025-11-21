import { Body, Controller, Get, Post, Put, Patch, Param, Query, Request, UseGuards, Ip, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
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
      destination: './uploads/id-cards',
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
    const updatedUser = await this.authService.uploadIdCard(user.id, dto.type, fileUrl);

    return {
      message: 'ID card uploaded successfully',
      user: updatedUser,
      fileUrl,
    };
  }

}
