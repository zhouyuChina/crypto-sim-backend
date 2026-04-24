import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';

import { AdminAuthService } from './admin-auth.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { QueryAdminsDto } from './dto/query-admins.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

/**
 * 管理员账号管理接口（仅 admin 角色可访问）
 * 路径前缀：/api/admin/admins
 */
@Controller('admin/admins')
@Roles('admin')
export class AdminManagementController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Get()
  async findAll(@Query() query: QueryAdminsDto) {
    return this.adminAuthService.findAllAdmins(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.adminAuthService.getAdminById(id);
  }

  @Post()
  async create(@Body() dto: CreateAdminDto) {
    return this.adminAuthService.createAdmin(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.adminAuthService.updateAdmin(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.adminAuthService.deleteAdmin(id);
  }
}
