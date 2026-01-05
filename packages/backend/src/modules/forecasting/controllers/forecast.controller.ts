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
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { ForecastService } from '../services/forecast.service';
import { CreateForecastDto } from '../dto/create-forecast.dto';
import { ForecastQueryDto } from '../dto/forecast-query.dto';
import { UpdateActualsDto } from '../dto/update-actuals.dto';
import { TimeSeriesPoint } from '../services/forecasting-engine.service';

@ApiTags('forecasting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('forecasts')
export class ForecastController {
  constructor(private readonly forecastService: ForecastService) {}

  @Post()
  @ApiOperation({ summary: 'Generate a new forecast' })
  @ApiResponse({ status: 201, description: 'Forecast generated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async generateForecast(
    @Request() req: any,
    @Body() dto: CreateForecastDto,
    @Body('historicalData') historicalData: TimeSeriesPoint[],
  ) {
    return this.forecastService.generateForecast(
      req.user.organizationId,
      dto,
      historicalData,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List forecasts' })
  @ApiResponse({ status: 200, description: 'Forecasts retrieved successfully' })
  async listForecasts(
    @Request() req: any,
    @Query() query: ForecastQueryDto,
  ) {
    return this.forecastService.listForecasts(req.user.organizationId, query);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest forecast' })
  @ApiResponse({ status: 200, description: 'Latest forecast retrieved' })
  @ApiResponse({ status: 404, description: 'No forecasts found' })
  async getLatest(
    @Request() req: any,
    @Query('type') type?: string,
  ) {
    return this.forecastService.getLatestForecast(req.user.organizationId, type as any);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get forecast by ID' })
  @ApiResponse({ status: 200, description: 'Forecast retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Forecast not found' })
  async getForecast(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.forecastService.getForecast(id, req.user.organizationId);
  }

  @Put(':id/actuals')
  @ApiOperation({ summary: 'Update actual values for comparison' })
  @ApiResponse({ status: 200, description: 'Actuals updated successfully' })
  @ApiResponse({ status: 404, description: 'Forecast not found' })
  async updateActuals(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateActualsDto,
  ) {
    return this.forecastService.updateActuals(id, req.user.organizationId, dto);
  }

  @Post(':id/accuracy')
  @ApiOperation({ summary: 'Calculate accuracy metrics' })
  @ApiResponse({ status: 200, description: 'Accuracy calculated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot calculate without actuals' })
  @ApiResponse({ status: 404, description: 'Forecast not found' })
  async calculateAccuracy(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.forecastService.calculateAccuracy(id, req.user.organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a forecast' })
  @ApiResponse({ status: 204, description: 'Forecast deleted successfully' })
  @ApiResponse({ status: 404, description: 'Forecast not found' })
  async deleteForecast(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    await this.forecastService.deleteForecast(id, req.user.organizationId);
  }
}
