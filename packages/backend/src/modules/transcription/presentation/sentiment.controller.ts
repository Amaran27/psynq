import {
  Controller,
  Get,
  Post,
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
import { SentimentService } from '../application/sentiment.service';
import { CreateSentimentDto } from '../dto';

@ApiTags('sentiments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sentiments')
export class SentimentController {
  constructor(private readonly sentimentService: SentimentService) {}

  @Post()
  @ApiOperation({ summary: 'Create sentiment record (manual)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Sentiment created' })
  async create(@Request() req, @Body() dto: CreateSentimentDto) {
    dto.organizationId = req.user.organizationId;
    return this.sentimentService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List sentiments with filters' })
  @ApiQuery({ name: 'transcriptionId', required: false })
  @ApiQuery({ name: 'callId', required: false })
  @ApiQuery({ name: 'score', required: false })
  @ApiQuery({ name: 'emotion', required: false })
  async findAll(@Request() req, @Query() query: any) {
    const filter = {
      organizationId: req.user.organizationId,
      ...query,
    };
    return this.sentimentService.findAll(filter);
  }

  @Get('negative')
  @ApiOperation({ summary: 'Get negative sentiments (for QA alerts)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Negative sentiments ordered by worst first' })
  async findNegative(@Request() req) {
    return this.sentimentService.findNegativeCalls(req.user.organizationId);
  }

  @Get('positive')
  @ApiOperation({ summary: 'Get positive sentiments (for testimonials)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Positive sentiments ordered by best first' })
  async findPositive(@Request() req) {
    return this.sentimentService.findPositiveCalls(req.user.organizationId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get sentiment statistics' })
  async getStatistics(@Request() req) {
    return this.sentimentService.getSentimentStats(req.user.organizationId);
  }

  @Get('distribution')
  @ApiOperation({ summary: 'Get sentiment distribution (histogram)' })
  async getDistribution(@Request() req) {
    return this.sentimentService.getSentimentDistribution(req.user.organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sentiment by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Sentiment found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Sentiment not found' })
  async findById(@Param('id') id: string) {
    return this.sentimentService.findById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete sentiment' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async delete(@Param('id') id: string) {
    await this.sentimentService.delete(id);
  }

  @Post('transcriptions/:transcriptionId/analyze')
  @ApiOperation({ summary: 'Analyze sentiment for transcription' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Sentiment analysis completed' })
  async analyze(@Param('transcriptionId') transcriptionId: string) {
    return this.sentimentService.analyzeSentiment(transcriptionId);
  }
}
