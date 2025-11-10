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
import { OperatorsService } from './operators.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateOperatorDto } from './dto/create-operator.dto';
import { UpdateOperatorDto } from './dto/update-operator.dto';
import { QueryOperatorsDto } from './dto/query-operators.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Controller('admin/operators')
@Roles('admin')
export class OperatorsController {
  private readonly logger = new Logger(OperatorsController.name);

  constructor(private readonly operatorsService: OperatorsService) {}

  /**
   * 创建操作员
   * POST /admin/operators
   */
  @Post()
  async create(@Body() dto: CreateOperatorDto, @CurrentUser() admin: any) {
    const operator = await this.operatorsService.create(dto, admin.sub);
    return {
      data: operator,
      message: '操作员创建成功',
    };
  }

  /**
   * 获取操作员列表
   * GET /admin/operators
   */
  @Get()
  async findAll(@Query() query: QueryOperatorsDto) {
    return await this.operatorsService.findAll(query);
  }

  /**
   * 获取单个操作员
   * GET /admin/operators/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return {
      data: await this.operatorsService.findOne(id),
    };
  }

  /**
   * 更新操作员
   * PUT /admin/operators/:id
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateOperatorDto) {
    const operator = await this.operatorsService.update(id, dto);
    return {
      data: operator,
      message: '操作员更新成功',
    };
  }

  /**
   * 删除操作员
   * DELETE /admin/operators/:id
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.operatorsService.remove(id);
  }

  /**
   * 为操作员创建交易流水
   * POST /admin/operators/:id/transactions
   */
  @Post(':id/transactions')
  async createTransaction(
    @Param('id') id: string,
    @Body() dto: CreateTransactionDto,
  ) {
    const transaction = await this.operatorsService.createTransaction(id, dto);
    return {
      data: transaction,
      message: '交易流水创建成功',
    };
  }

  /**
   * 获取操作员的交易流水列表
   * GET /admin/operators/:id/transactions
   */
  @Get(':id/transactions')
  async getTransactions(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return {
      data: await this.operatorsService.getTransactions(
        id,
        page ? Number(page) : 1,
        pageSize ? Number(pageSize) : 10,
      ),
    };
  }

  /**
   * 更新交易流水
   * PUT /admin/operators/:id/transactions/:txId
   */
  @Put(':id/transactions/:txId')
  async updateTransaction(
    @Param('id') id: string,
    @Param('txId') txId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    const transaction = await this.operatorsService.updateTransaction(
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
   * DELETE /admin/operators/:id/transactions/:txId
   */
  @Delete(':id/transactions/:txId')
  async deleteTransaction(
    @Param('id') id: string,
    @Param('txId') txId: string,
  ) {
    return await this.operatorsService.deleteTransaction(id, txId);
  }
}
