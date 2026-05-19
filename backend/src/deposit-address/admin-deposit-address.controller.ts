import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';

import { Roles } from '../common/decorators/roles.decorator';

import { DepositAddressRiskCheckerService } from './deposit-address-risk-checker.service';
import { DepositAddressService } from './deposit-address.service';
import {
  CreateDepositAddressDto,
  UpdateDepositAddressDto,
} from './dto/admin-deposit-address.dto';

@Controller('admin/settings/deposit/addresses')
@Roles('admin')
export class AdminDepositAddressController {
  constructor(
    private readonly depositAddressService: DepositAddressService,
    private readonly riskChecker: DepositAddressRiskCheckerService
  ) {}

  @Get()
  async list() {
    return { data: await this.depositAddressService.listAll() };
  }

  @Post()
  async create(@Body() dto: CreateDepositAddressDto) {
    return { data: await this.depositAddressService.create(dto) };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDepositAddressDto) {
    return { data: await this.depositAddressService.update(id, dto) };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.depositAddressService.remove(id);
    return { message: '入金地址已删除' };
  }

  @Post(':id/risk-check')
  async riskCheck(@Param('id') id: string) {
    const record = await this.depositAddressService.getById(id);
    const status = await this.riskChecker.checkOne(record.id, record.address);
    return { data: { riskStatus: status } };
  }
}
