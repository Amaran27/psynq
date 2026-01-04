import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { RatingService } from '../application/rating.service';
import { CreateWalletDto } from '../application/dto/create-wallet.dto';
import { UpdateWalletDto } from '../application/dto/update-wallet.dto';
import { WalletTransactionDto } from '../application/dto/wallet-transaction.dto';

@ApiTags('Rating Engine - Customer Wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/rating/wallets')
export class WalletsController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer wallet' })
  @ApiResponse({ status: 201, description: 'Wallet created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or wallet already exists' })
  async create(@Body() dto: CreateWalletDto) {
    return this.ratingService.createWallet(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all wallets' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiResponse({ status: 200, description: 'Wallets retrieved successfully' })
  async findAll(@Query('organizationId') organizationId?: string) {
    return this.ratingService.getAllWallets(organizationId);
  }

  @Get('customer/:organizationId/:customerId')
  @ApiOperation({ summary: 'Get wallet by customer' })
  @ApiResponse({ status: 200, description: 'Wallet retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async findByCustomer(
    @Param('organizationId') organizationId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.ratingService.getWalletByCustomer(organizationId, customerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiResponse({ status: 200, description: 'Wallet retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async findOne(@Param('id') id: string) {
    return this.ratingService.getWallet(id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get wallet statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getStatistics(@Param('id') id: string) {
    return this.ratingService.getWalletStatistics(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update wallet settings' })
  @ApiResponse({ status: 200, description: 'Wallet updated successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateWalletDto) {
    return this.ratingService.updateWallet(id, dto);
  }

  @Post(':id/transaction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process wallet transaction (credit/debit/refund/adjust)' })
  @ApiResponse({ status: 200, description: 'Transaction processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid transaction or insufficient balance' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async transaction(@Param('id') id: string, @Body() dto: WalletTransactionDto) {
    return this.ratingService.processWalletTransaction(id, dto);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend wallet' })
  @ApiResponse({ status: 200, description: 'Wallet suspended successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async suspend(@Param('id') id: string) {
    return this.ratingService.suspendWallet(id);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate wallet' })
  @ApiResponse({ status: 200, description: 'Wallet activated successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async activate(@Param('id') id: string) {
    return this.ratingService.activateWallet(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Close and delete wallet' })
  @ApiResponse({ status: 204, description: 'Wallet deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete wallet with positive balance' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async remove(@Param('id') id: string) {
    await this.ratingService.deleteWallet(id);
  }
}
