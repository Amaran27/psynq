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
import { ContactService } from '../application/contact.service';
import { CreateContactDto, UpdateContactDto } from '../dto';

@ApiTags('whatsapp/contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('whatsapp/contacts')
export class WhatsAppContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Create a WhatsApp contact' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Contact created' })
  async create(@Request() req, @Body() dto: CreateContactDto) {
    dto.organizationId = req.user.organizationId;
    return this.contactService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List contacts with filters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'phoneNumber', required: false })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  async findAll(@Request() req, @Query() query: any) {
    const filter = {
      organizationId: req.user.organizationId,
      ...query,
      tags: query.tags ? (Array.isArray(query.tags) ? query.tags : [query.tags]) : undefined,
    };
    return this.contactService.findAll(filter);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active contacts' })
  async findActive(@Request() req) {
    return this.contactService.findActive(req.user.organizationId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get contact statistics' })
  async getStatistics(@Request() req) {
    return this.contactService.getContactStats(req.user.organizationId);
  }

  @Get('by-tags')
  @ApiOperation({ summary: 'Find contacts by tags' })
  @ApiQuery({ name: 'tags', required: true, type: [String] })
  async findByTags(@Request() req, @Query('tags') tags: string | string[]) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    return this.contactService.findByTags(req.user.organizationId, tagArray);
  }

  @Get('phone/:phoneNumber')
  @ApiOperation({ summary: 'Get contact by phone number' })
  async findByPhoneNumber(@Request() req, @Param('phoneNumber') phoneNumber: string) {
    return this.contactService.findByPhoneNumber(req.user.organizationId, phoneNumber);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Contact found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Contact not found' })
  async findById(@Param('id') id: string) {
    return this.contactService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update contact' })
  async update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete contact' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async delete(@Param('id') id: string) {
    await this.contactService.delete(id);
  }

  @Post(':id/opt-out')
  @ApiOperation({ summary: 'Opt out contact from messages' })
  async optOut(@Param('id') id: string) {
    return this.contactService.optOut(id);
  }

  @Post(':id/opt-in')
  @ApiOperation({ summary: 'Opt in contact to receive messages' })
  async optIn(@Param('id') id: string) {
    return this.contactService.optIn(id);
  }

  @Post(':id/block')
  @ApiOperation({ summary: 'Block contact' })
  async block(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.contactService.block(id, reason);
  }

  @Post(':id/unblock')
  @ApiOperation({ summary: 'Unblock contact' })
  async unblock(@Param('id') id: string) {
    return this.contactService.unblock(id);
  }

  @Post(':id/tags/:tag')
  @ApiOperation({ summary: 'Add tag to contact' })
  async addTag(@Param('id') id: string, @Param('tag') tag: string) {
    return this.contactService.addTag(id, tag);
  }

  @Delete(':id/tags/:tag')
  @ApiOperation({ summary: 'Remove tag from contact' })
  async removeTag(@Param('id') id: string, @Param('tag') tag: string) {
    return this.contactService.removeTag(id, tag);
  }
}
