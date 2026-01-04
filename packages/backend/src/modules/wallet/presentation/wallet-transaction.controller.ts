/**
 * Wallet Transaction REST Controller
 * 
 * UI-friendly REST API for transaction history and statistics
 */

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { WalletService } from '../application/wallet.service';

@ApiTags('wallet-transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet-transactions')
export class WalletTransactionController {
  constructor(private readonly walletService: WalletService) {}

  @Get('wallet/:walletId')
  @ApiOperation({ summary: 'Get transaction history for a wallet' })
  @ApiQuery({ name: 'type', required: false, enum: ['credit', 'debit', 'refund', 'adjustment', 'auto_recharge'] })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'completed', 'failed', 'reversed'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findByWallet(@Param('walletId') walletId: string, @Query() filters: any) {
    return this.walletService.getTransactionHistory(walletId, filters);
  }

  @Get('wallet/:walletId/statistics')
  @ApiOperation({ summary: 'Get transaction statistics for a wallet' })
  @ApiQuery({ name: 'startDate', required: false, type: Date })
  @ApiQuery({ name: 'endDate', required: false, type: Date })
  async getWalletStatistics(
    @Param('walletId') walletId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.walletService.getTransactionStatistics(walletId, start, end);
  }

  @Get('organization')
  @ApiOperation({ summary: 'Get all transactions for organization' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findByOrganization(@Request() req, @Query() filters: any) {
    return this.walletService.getOrganizationTransactions(req.user.organizationId, filters);
  }

  @Post(':id/reverse')
  @ApiOperation({ summary: 'Reverse a transaction' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Transaction reversed' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot reverse transaction' })
  async reverse(@Request() req, @Param('id') id: string) {
    return this.walletService.reverseTransaction(id, req.user.userId);
  }
}
