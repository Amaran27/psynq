import { PartialType } from '@nestjs/swagger';
import { CreateWhatsAppConfigurationDto } from './create-whatsapp-configuration.dto';

export class UpdateWhatsAppConfigurationDto extends PartialType(CreateWhatsAppConfigurationDto) {}
