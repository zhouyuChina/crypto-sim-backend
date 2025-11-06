import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { CustomMembersService } from './custom-members.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateCustomMemberDto } from './dto/create-custom-member.dto';
import { UpdateCustomMemberDto } from './dto/update-custom-member.dto';
import { QueryCustomMembersDto } from './dto/query-custom-members.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Controller('admin/custom-members')
@Roles('admin')
export class CustomMembersController {
  private readonly logger = new Logger(CustomMembersController.name);

  constructor(private readonly customMembersService: CustomMembersService) {}

  /**
   * 创建自定义会员
   * POST /admin/custom-members
   */
  @Post()
  async create(@Body() dto: CreateCustomMemberDto, @CurrentUser() admin: any) {
    const member = await this.customMembersService.create(dto, admin.sub);
    return {
      data: member,
      message: '自定义会员创建成功',
    };
  }

  /**
   * 获取自定义会员列表
   * GET /admin/custom-members
   */
  @Get()
  async findAll(@Query() query: QueryCustomMembersDto) {
    return {
      data: await this.customMembersService.findAll(query),
    };
  }

  /**
   * 获取单个自定义会员
   * GET /admin/custom-members/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return {
      data: await this.customMembersService.findOne(id),
    };
  }

  /**
   * 更新自定义会员
   * PUT /admin/custom-members/:id
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomMemberDto) {
    const member = await this.customMembersService.update(id, dto);
    return {
      data: member,
      message: '自定义会员更新成功',
    };
  }

  /**
   * 删除自定义会员
   * DELETE /admin/custom-members/:id
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.customMembersService.remove(id);
  }

  /**
   * 为自定义会员创建交易流水
   * POST /admin/custom-members/:id/transactions
   */
  @Post(':id/transactions')
  async createTransaction(
    @Param('id') id: string,
    @Body() dto: CreateTransactionDto,
  ) {
    const transaction = await this.customMembersService.createTransaction(id, dto);
    return {
      data: transaction,
      message: '交易流水创建成功',
    };
  }

  /**
   * 获取自定义会员的交易流水列表
   * GET /admin/custom-members/:id/transactions
   */
  @Get(':id/transactions')
  async getTransactions(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return {
      data: await this.customMembersService.getTransactions(
        id,
        page ? Number(page) : 1,
        pageSize ? Number(pageSize) : 10,
      ),
    };
  }

  /**
   * 更新交易流水
   * PUT /admin/custom-members/:id/transactions/:txId
   */
  @Put(':id/transactions/:txId')
  async updateTransaction(
    @Param('id') id: string,
    @Param('txId') txId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    const transaction = await this.customMembersService.updateTransaction(
      id,
      txId,
      dto,
    );
    return {
      data: transaction,
      message: '交易流水更新成功',
    };
  }

  /**
   * 删除交易流水
   * DELETE /admin/custom-members/:id/transactions/:txId
   */
  @Delete(':id/transactions/:txId')
  async deleteTransaction(
    @Param('id') id: string,
    @Param('txId') txId: string,
  ) {
    return await this.customMembersService.deleteTransaction(id, txId);
  }
}
