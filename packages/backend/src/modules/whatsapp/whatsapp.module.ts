import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

// Entities
import { WhatsAppMessageEntity } from './infrastructure/persistence/typeorm/entities/whatsapp-message.entity';
import { WhatsAppTemplateEntity } from './infrastructure/persistence/typeorm/entities/whatsapp-template.entity';
import { WhatsAppContactEntity } from './infrastructure/persistence/typeorm/entities/whatsapp-contact.entity';

// Port tokens
import {
  WHATSAPP_MESSAGE_REPOSITORY_PORT,
  WHATSAPP_TEMPLATE_REPOSITORY_PORT,
  WHATSAPP_CONTACT_REPOSITORY_PORT,
  WHATSAPP_PROVIDER_PORT,
} from './domain/ports';

// Adapters
import { TypeOrmWhatsAppMessageRepositoryAdapter } from './infrastructure/adapters/typeorm-whatsapp-message-repository.adapter';
import { TypeOrmWhatsAppTemplateRepositoryAdapter } from './infrastructure/adapters/typeorm-whatsapp-template-repository.adapter';
import { TypeOrmWhatsAppContactRepositoryAdapter } from './infrastructure/adapters/typeorm-whatsapp-contact-repository.adapter';
import { MetaWhatsAppProviderAdapter } from './infrastructure/adapters/meta-whatsapp-provider.adapter';

// Services
import { WhatsAppService } from './application/whatsapp.service';
import { TemplateService } from './application/template.service';
import { ContactService } from './application/contact.service';

// Controllers
import { WhatsAppMessageController } from './presentation/whatsapp-message.controller';
import { WhatsAppTemplateController } from './presentation/whatsapp-template.controller';
import { WhatsAppContactController } from './presentation/whatsapp-contact.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WhatsAppMessageEntity,
      WhatsAppTemplateEntity,
      WhatsAppContactEntity,
    ]),
    HttpModule,
  ],
  controllers: [
    WhatsAppMessageController,
    WhatsAppTemplateController,
    WhatsAppContactController,
  ],
  providers: [
    // Repository adapters
    {
      provide: WHATSAPP_MESSAGE_REPOSITORY_PORT,
      useClass: TypeOrmWhatsAppMessageRepositoryAdapter,
    },
    {
      provide: WHATSAPP_TEMPLATE_REPOSITORY_PORT,
      useClass: TypeOrmWhatsAppTemplateRepositoryAdapter,
    },
    {
      provide: WHATSAPP_CONTACT_REPOSITORY_PORT,
      useClass: TypeOrmWhatsAppContactRepositoryAdapter,
    },
    // WhatsApp provider adapter
    {
      provide: WHATSAPP_PROVIDER_PORT,
      useClass: MetaWhatsAppProviderAdapter,
    },
    // Services
    WhatsAppService,
    TemplateService,
    ContactService,
  ],
  exports: [WhatsAppService, TemplateService, ContactService],
})
export class WhatsAppModule {}
