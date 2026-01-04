import {
  Controller,
  Post,
  Get,
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
import { CreateUsageRecordDto } from '../application/dto/create-usage-record.dto';
import { ProcessRatingDto } from '../application/dto/process-rating.dto';

@ApiTags('Rating Engine - Usage & Batches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/rating')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  // ================== Usage Records ==================

  @Post('usage')
  @ApiOperation({ summary: 'Create a new usage record' })
  @ApiResponse({ status: 201, description: 'Usage record created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createUsage(@Body() dto: CreateUsageRecordDto) {
    return this.ratingService.createUsageRecord(dto);
  }

  @Get('usage/:id')
  @ApiOperation({ summary: 'Get usage record by ID' })
  @ApiResponse({ status: 200, description: 'Usage record retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Usage record not found' })
  async getUsage(@Param('id') id: string) {
    return this.ratingService.getUsageRecord(id);
  }

  @Get('usage/customer/:organizationId/:customerId')
  @ApiOperation({ summary: 'Get usage records by customer' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Usage records retrieved successfully' })
  async getUsageByCustomer(
    @Param('organizationId') organizationId: string,
    @Param('customerId') customerId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ratingService.getUsageRecordsByCustomer(
      organizationId,
      customerId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('usage/pending/:organizationId')
  @ApiOperation({ summary: 'Get pending usage records' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Pending usage records retrieved successfully' })
  async getPendingUsage(
    @Param('organizationId') organizationId: string,
    @Query('limit') limit?: number,
  ) {
    return this.ratingService.getPendingUsageRecords(organizationId, limit);
  }

  // ================== Rating Batches ==================

  @Post('batches/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process batch rating for pending usage records' })
  @ApiResponse({ status: 200, description: 'Batch rating completed' })
  @ApiResponse({ status: 400, description: 'No pending records or processing failed' })
  async processBatch(@Body() dto: ProcessRatingDto) {
    return this.ratingService.processBatchRating(dto);
  }

  @Get('batches/:id')
  @ApiOperation({ summary: 'Get rating batch by ID' })
  @ApiResponse({ status: 200, description: 'Rating batch retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Rating batch not found' })
  async getBatch(@Param('id') id: string) {
    return this.ratingService.getRatingBatch(id);
  }

  @Get('batches/:id/statistics')
  @ApiOperation({ summary: 'Get rating batch statistics' })
  @ApiResponse({ status: 200, description: 'Batch statistics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Rating batch not found' })
  async getBatchStatistics(@Param('id') id: string) {
    return this.ratingService.getBatchStatistics(id);
  }

  @Get('batches/organization/:organizationId')
  @ApiOperation({ summary: 'Get all rating batches for organization' })
  @ApiResponse({ status: 200, description: 'Rating batches retrieved successfully' })
  async getBatchesByOrganization(@Param('organizationId') organizationId: string) {
    return this.ratingService.getRatingBatches(organizationId);
  }

  // ================== Statistics ==================

  @Get('statistics/:organizationId')
  @ApiOperation({ summary: 'Get organization rating statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getOrganizationStatistics(@Param('organizationId') organizationId: string) {
    return this.ratingService.getOrganizationStatistics(organizationId);
  }
}
