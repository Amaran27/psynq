import { PartialType } from '@nestjs/swagger';
import { CreateCrmIntegrationDto } from './create-crm-integration.dto';

export class UpdateCrmIntegrationDto extends PartialType(CreateCrmIntegrationDto) {}
