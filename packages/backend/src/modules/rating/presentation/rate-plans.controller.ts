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
import { CreateRatePlanDto } from '../application/dto/create-rate-plan.dto';
import { UpdateRatePlanDto } from '../application/dto/update-rate-plan.dto';

@ApiTags('Rating Engine - Rate Plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/rating/rate-plans')
export class RatePlansController {
  constructor(private readonly ratingService: RatingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new rate plan' })
  @ApiResponse({ status: 201, description: 'Rate plan created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() dto: CreateRatePlanDto) {
    return this.ratingService.createRatePlan(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all rate plans' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiResponse({ status: 200, description: 'Rate plans retrieved successfully' })
  async findAll(@Query('organizationId') organizationId?: string) {
    return this.ratingService.getAllRatePlans(organizationId);
  }

  @Get('active/:organizationId')
  @ApiOperation({ summary: 'Get active rate plans for organization' })
  @ApiResponse({ status: 200, description: 'Active rate plans retrieved successfully' })
  async findActive(@Param('organizationId') organizationId: string) {
    return this.ratingService.getActiveRatePlans(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get rate plan by ID' })
  @ApiResponse({ status: 200, description: 'Rate plan retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Rate plan not found' })
  async findOne(@Param('id') id: string) {
    return this.ratingService.getRatePlan(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update rate plan' })
  @ApiResponse({ status: 200, description: 'Rate plan updated successfully' })
  @ApiResponse({ status: 404, description: 'Rate plan not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateRatePlanDto) {
    return this.ratingService.updateRatePlan(id, dto);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate rate plan' })
  @ApiResponse({ status: 200, description: 'Rate plan activated successfully' })
  @ApiResponse({ status: 404, description: 'Rate plan not found' })
  async activate(@Param('id') id: string) {
    return this.ratingService.activateRatePlan(id);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend rate plan' })
  @ApiResponse({ status: 200, description: 'Rate plan suspended successfully' })
  @ApiResponse({ status: 404, description: 'Rate plan not found' })
  async suspend(@Param('id') id: string) {
    return this.ratingService.suspendRatePlan(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete rate plan' })
  @ApiResponse({ status: 204, description: 'Rate plan deleted successfully' })
  @ApiResponse({ status: 404, description: 'Rate plan not found' })
  async remove(@Param('id') id: string) {
    await this.ratingService.deleteRatePlan(id);
  }
}
