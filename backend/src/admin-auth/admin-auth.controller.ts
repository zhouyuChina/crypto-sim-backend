import { Controller, Post, Body, UseGuards, Get, Put, Delete, Param } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Public()
  @Post('login')
  async login(@Body() loginDto: AdminLoginDto) {
    return this.adminAuthService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.adminAuthService.refreshTokens(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: any) {
    return this.adminAuthService.logout(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.adminAuthService.validateAdmin(user.sub);
  }

  // ==================== 管理员管理接口 ====================

  /**
   * 获取所有管理员列表
   */
  @UseGuards(JwtAuthGuard)
  @Get('admins')
  async getAllAdmins() {
    return this.adminAuthService.getAllAdmins();
  }

  /**
   * 获取单个管理员详情
   */
  @UseGuards(JwtAuthGuard)
  @Get('admins/:id')
  async getAdminById(@Param('id') id: string) {
    return this.adminAuthService.getAdminById(id);
  }

  /**
   * 创建新管理员
   */
  @UseGuards(JwtAuthGuard)
  @Post('admins')
  async createAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.adminAuthService.createAdmin(createAdminDto);
  }

  /**
   * 更新管理员信息
   */
  @UseGuards(JwtAuthGuard)
  @Put('admins/:id')
  async updateAdmin(
    @Param('id') id: string,
    @Body() updateAdminDto: UpdateAdminDto,
  ) {
    return this.adminAuthService.updateAdmin(id, updateAdminDto);
  }

  /**
   * 删除管理员
   */
  @UseGuards(JwtAuthGuard)
  @Delete('admins/:id')
  async deleteAdmin(@Param('id') id: string) {
    return this.adminAuthService.deleteAdmin(id);
  }
}
