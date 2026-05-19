import { Body, Controller, Header, Post, UseGuards } from '@nestjs/common';

import type { UserEntity } from '../auth/entities/user.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { DepositAddressService } from './deposit-address.service';
import { AllocateDepositAddressDto } from './dto/allocate-deposit-address.dto';

@Controller('settings/deposit')
@UseGuards(JwtAuthGuard)
export class PublicDepositAddressController {
  constructor(private readonly depositAddressService: DepositAddressService) {}

  /**
   * 客户端按金额请求一个入金地址。
   * POST /settings/deposit/address
   * body: { amount: number }
   */
  @Post('address')
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async allocate(
    @CurrentUser() user: UserEntity,
    @Body() dto: AllocateDepositAddressDto
  ) {
    return {
      data: await this.depositAddressService.allocateForUser(user.id, dto.amount),
    };
  }
}
