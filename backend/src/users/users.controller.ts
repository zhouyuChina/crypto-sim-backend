import { Controller, Get, Put, Delete, Patch, Query, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { PaginatedUsersResponseDto, UserResponseDto } from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('admin')
  async findAll(
    @Query() query: QueryUsersDto,
  ): Promise<PaginatedUsersResponseDto> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @Roles('admin')
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Put(':id')
  @Roles('admin')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(':id/activate')
  @Roles('admin')
  async activate(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.activate(id);
  }

  @Patch(':id/deactivate')
  @Roles('admin')
  async deactivate(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.deactivate(id);
  }

  @Patch(':id/roles')
  @Roles('admin')
  async updateRoles(
    @Param('id') id: string,
    @Body() updateRolesDto: UpdateUserRolesDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateRoles(id, updateRolesDto);
  }

  @Patch(':id/balance')
  @Roles('admin')
  async adjustBalance(
    @Param('id') id: string,
    @Body() adjustBalanceDto: AdjustBalanceDto,
  ): Promise<UserResponseDto> {
    return this.usersService.adjustBalance(id, adjustBalanceDto);
  }

  @Delete(':id')
  @Roles('admin')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.usersService.remove(id);
  }

  @Patch(':id/reset-password')
  @Roles('admin')
  async resetPassword(
    @Param('id') id: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<UserResponseDto> {
    return this.usersService.resetPassword(id, resetPasswordDto.newPassword);
  }
}
