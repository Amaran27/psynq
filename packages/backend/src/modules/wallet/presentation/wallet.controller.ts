/**
 * Wallet REST Controller
 * 
 * UI-friendly REST API for wallet management
 */

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
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { WalletService } from '../application/wallet.service';
import { CreateWalletDto, CreditWalletDto, DebitWalletDto, AdjustWalletDto, UpdateWalletDto } from '../dto';

@ApiTags('wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Wallet created successfully' })
  async create(@Request() req, @Body() dto: CreateWalletDto) {
    dto.organizationId = req.user.organizationId;
    return this.walletService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all wallets for organization' })
  @ApiQuery({ name: 'type', required: false, enum: ['prepaid', 'postpaid'] })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'suspended', 'blocked', 'closed'] })
  @ApiQuery({ name: 'currency', required: false })
  async findAll(@Request() req, @Query() filters: any) {
    return this.walletService.findByOrganization(req.user.organizationId, filters);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get wallet statistics for organization' })
  async getStatistics(@Request() req) {
    return this.walletService.getWalletStatistics(req.user.organizationId);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get wallet for a customer' })
  async findByCustomer(@Request() req, @Param('customerId') customerId: string) {
    return this.walletService.findByCustomer(req.user.organizationId, customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Wallet found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Wallet not found' })
  async findById(@Param('id') id: string) {
    return this.walletService.findById(id);
  }

  @Post(':id/credit')
  @ApiOperation({ summary: 'Credit wallet (add funds)' })
  async credit(@Request() req, @Param('id') id: string, @Body() dto: CreditWalletDto) {
    return this.walletService.credit(id, dto, req.user.userId);
  }

  @Post(':id/debit')
  @ApiOperation({ summary: 'Debit wallet (charge/deduct funds)' })
  async debit(@Request() req, @Param('id') id: string, @Body() dto: DebitWalletDto) {
    return this.walletService.debit(id, dto, req.user.userId);
  }

  @Post(':id/adjust')
  @ApiOperation({ summary: 'Adjust wallet balance (manual correction)' })
  async adjust(@Request() req, @Param('id') id: string, @Body() dto: AdjustWalletDto) {
    return this.walletService.adjust(id, dto, req.user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update wallet configuration' })
  async update(@Param('id') id: string, @Body() dto: UpdateWalletDto) {
    return this.walletService.update(id, dto);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend wallet' })
  async suspend(@Param('id') id: string, @Body('reason') reason: string) {
    return this.walletService.suspend(id, reason);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate/reactivate wallet' })
  async activate(@Param('id') id: string) {
    return this.walletService.activate(id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close wallet permanently' })
  async close(@Param('id') id: string, @Body('reason') reason: string) {
    return this.walletService.close(id, reason);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete wallet' })
  async delete(@Param('id') id: string) {
    await this.walletService.delete(id);
    return { message: 'Wallet deleted successfully' };
  }
}
