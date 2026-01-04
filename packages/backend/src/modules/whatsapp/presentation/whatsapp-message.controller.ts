import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { WhatsAppService } from '../application/whatsapp.service';
import { SendMessageDto, SendTemplateMessageDto } from '../dto';

@ApiTags('whatsapp/messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('whatsapp/messages')
export class WhatsAppMessageController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post()
  @ApiOperation({ summary: 'Send a WhatsApp message' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Message sent successfully' })
  async sendMessage(@Request() req, @Body() dto: SendMessageDto) {
    dto.organizationId = req.user.organizationId;
    return this.whatsappService.sendMessage(dto);
  }

  @Post('template')
  @ApiOperation({ summary: 'Send a WhatsApp template message' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Template message sent' })
  async sendTemplateMessage(@Request() req, @Body() dto: SendTemplateMessageDto) {
    return this.whatsappService.sendTemplateMessage(dto, req.user.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'List messages with filters' })
  @ApiQuery({ name: 'phoneNumber', required: false })
  @ApiQuery({ name: 'conversationId', required: false })
  @ApiQuery({ name: 'contactId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'direction', required: false })
  async findAll(@Request() req, @Query() query: any) {
    const filter = {
      organizationId: req.user.organizationId,
      ...query,
    };
    return this.whatsappService.findAll(filter);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get message statistics' })
  async getStatistics(@Request() req) {
    return this.whatsappService.getMessageStats(req.user.organizationId);
  }

  @Get('phone/:phoneNumber')
  @ApiOperation({ summary: 'Get messages for a phone number' })
  async findByPhoneNumber(@Param('phoneNumber') phoneNumber: string) {
    return this.whatsappService.findByPhoneNumber(phoneNumber);
  }

  @Get('conversation/:conversationId')
  @ApiOperation({ summary: 'Get messages in a conversation' })
  async findByConversation(@Param('conversationId') conversationId: string) {
    return this.whatsappService.findByConversation(conversationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get message by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Message found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Message not found' })
  async findById(@Param('id') id: string) {
    return this.whatsappService.findById(id);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'WhatsApp webhook endpoint (Meta)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Webhook processed' })
  async handleWebhook(@Request() req, @Body() payload: any, @Headers('x-hub-signature-256') signature: string) {
    // Extract organizationId from request (webhook calls should include auth)
    const organizationId = req.user?.organizationId || 'default';
    await this.whatsappService.handleWebhook(organizationId, payload, signature);
    return { status: 'ok' };
  }

  @Get('webhook/verify')
  @ApiOperation({ summary: 'Verify WhatsApp webhook (Meta challenge)' })
  async verifyWebhook(@Query('hub.mode') mode: string, @Query('hub.challenge') challenge: string, @Query('hub.verify_token') token: string) {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || '';
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return { error: 'Verification failed' };
  }
}
