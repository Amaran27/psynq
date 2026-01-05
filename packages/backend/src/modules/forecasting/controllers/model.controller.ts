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
import { ModelTrainingService } from '../services/model-training.service';
import { CreateModelDto } from '../dto/create-model.dto';
import { UpdateModelDto } from '../dto/update-model.dto';
import { ModelQueryDto } from '../dto/model-query.dto';
import { TimeSeriesPoint } from '../services/forecasting-engine.service';

@ApiTags('forecast-models')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('forecast-models')
export class ModelController {
  constructor(private readonly modelService: ModelTrainingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new forecast model' })
  @ApiResponse({ status: 201, description: 'Model created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createModel(
    @Request() req: any,
    @Body() dto: CreateModelDto,
  ) {
    return this.modelService.createModel(req.user.organizationId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List forecast models' })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  async listModels(
    @Request() req: any,
    @Query() query: ModelQueryDto,
  ) {
    return this.modelService.listModels(req.user.organizationId, query);
  }

  @Get('best')
  @ApiOperation({ summary: 'Get best performing model' })
  @ApiResponse({ status: 200, description: 'Best model retrieved' })
  @ApiResponse({ status: 404, description: 'No models found' })
  async getBestModel(
    @Request() req: any,
    @Query('type') type?: string,
  ) {
    return this.modelService.getBestModel(req.user.organizationId, type as any);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get model by ID' })
  @ApiResponse({ status: 200, description: 'Model retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async getModel(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.modelService.getModel(id, req.user.organizationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a model' })
  @ApiResponse({ status: 200, description: 'Model updated successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async updateModel(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateModelDto,
  ) {
    return this.modelService.updateModel(id, req.user.organizationId, dto);
  }

  @Post(':id/train')
  @ApiOperation({ summary: 'Train a model with historical data' })
  @ApiResponse({ status: 200, description: 'Model trained successfully' })
  @ApiResponse({ status: 400, description: 'Training failed' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async trainModel(
    @Request() req: any,
    @Param('id') id: string,
    @Body('trainingData') trainingData: TimeSeriesPoint[],
  ) {
    return this.modelService.trainModel(id, req.user.organizationId, trainingData);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a model for predictions' })
  @ApiResponse({ status: 200, description: 'Model activated successfully' })
  @ApiResponse({ status: 400, description: 'Model not trained' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async activateModel(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.modelService.activateModel(id, req.user.organizationId);
  }

  @Post(':id/deprecate')
  @ApiOperation({ summary: 'Deprecate a model' })
  @ApiResponse({ status: 200, description: 'Model deprecated successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async deprecateModel(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.modelService.deprecateModel(id, req.user.organizationId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a model' })
  @ApiResponse({ status: 204, description: 'Model deleted successfully' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async deleteModel(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    await this.modelService.deleteModel(id, req.user.organizationId);
  }
}
