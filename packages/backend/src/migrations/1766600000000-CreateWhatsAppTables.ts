import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateWhatsAppTables1766600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "message_type_enum" AS ENUM (
        'text', 'image', 'video', 'audio', 'document',
        'location', 'contacts', 'template', 'interactive'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "message_status_enum" AS ENUM (
        'pending', 'sent', 'delivered', 'read', 'failed'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "message_direction_enum" AS ENUM (
        'inbound', 'outbound'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "template_category_enum" AS ENUM (
        'marketing', 'utility', 'authentication'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "template_status_enum" AS ENUM (
        'draft', 'pending', 'approved', 'rejected'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "template_language_enum" AS ENUM (
        'en', 'en_US', 'es', 'es_ES', 'pt_BR',
        'fr', 'de', 'it', 'ar', 'hi', 'zh_CN'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "contact_status_enum" AS ENUM (
        'active', 'blocked', 'opted_out'
      );
    `);

    // Create whatsapp_messages table
    await queryRunner.createTable(
      new Table({
        name: 'whatsapp_messages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'phoneNumber',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'type',
            type: 'message_type_enum',
          },
          {
            name: 'direction',
            type: 'message_direction_enum',
          },
          {
            name: 'status',
            type: 'message_status_enum',
            default: "'pending'",
          },
          {
            name: 'content',
            type: 'jsonb',
          },
          {
            name: 'conversationId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'contactId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'campaignId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'agentId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'templateId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'mediaUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'mediaType',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'mediaSizeBytes',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'externalMessageId',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'externalTimestamp',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'deliveredAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'readAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'failedReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Indexes for whatsapp_messages
    await queryRunner.createIndex(
      'whatsapp_messages',
      new TableIndex({
        name: 'IDX_WHATSAPP_MESSAGES_ORG_PHONE',
        columnNames: ['organizationId', 'phoneNumber'],
      }),
    );

    await queryRunner.createIndex(
      'whatsapp_messages',
      new TableIndex({
        name: 'IDX_WHATSAPP_MESSAGES_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'whatsapp_messages',
      new TableIndex({
        name: 'IDX_WHATSAPP_MESSAGES_DIRECTION',
        columnNames: ['direction'],
      }),
    );

    await queryRunner.createIndex(
      'whatsapp_messages',
      new TableIndex({
        name: 'IDX_WHATSAPP_MESSAGES_CONVERSATION',
        columnNames: ['conversationId'],
      }),
    );

    await queryRunner.createIndex(
      'whatsapp_messages',
      new TableIndex({
        name: 'IDX_WHATSAPP_MESSAGES_CONTACT',
        columnNames: ['contactId'],
      }),
    );

    await queryRunner.createIndex(
      'whatsapp_messages',
      new TableIndex({
        name: 'IDX_WHATSAPP_MESSAGES_EXTERNAL',
        columnNames: ['externalMessageId'],
      }),
    );

    await queryRunner.createIndex(
      'whatsapp_messages',
      new TableIndex({
        name: 'IDX_WHATSAPP_MESSAGES_CREATED',
        columnNames: ['createdAt'],
      }),
    );

    // Foreign key
    await queryRunner.createForeignKey(
      'whatsapp_messages',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );

    // Create whatsapp_templates table
    await queryRunner.createTable(
      new Table({
        name: 'whatsapp_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'category',
            type: 'template_category_enum',
          },
          {
            name: 'language',
            type: 'template_language_enum',
          },
          {
            name: 'status',
            type: 'template_status_enum',
            default: "'draft'",
          },
          {
            name: 'components',
            type: 'jsonb',
          },
          {
            name: 'externalTemplateId',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'externalTemplateName',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'rejectionReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Indexes for whatsapp_templates
    await queryRunner.createIndex(
      'whatsapp_templates',
      new TableIndex({
        name: 'IDX_WHATSAPP_TEMPLATES_ORG_NAME',
        columnNames: ['organizationId', 'name'],
      }),
    );

    await queryRunner.createIndex(
      'whatsapp_templates',
      new TableIndex({
        name: 'IDX_WHATSAPP_TEMPLATES_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'whatsapp_templates',
      new TableIndex({
        name: 'IDX_WHATSAPP_TEMPLATES_CATEGORY',
        columnNames: ['category'],
      }),
    );

    await queryRunner.createIndex(
      'whatsapp_templates',
      new TableIndex({
        name: 'IDX_WHATSAPP_TEMPLATES_EXTERNAL',
        columnNames: ['externalTemplateId'],
      }),
    );

    // Foreign key
    await queryRunner.createForeignKey(
      'whatsapp_templates',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );

    // Create whatsapp_contacts table
    await queryRunner.createTable(
      new Table({
        name: 'whatsapp_contacts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'phoneNumber',
            type: 'varchar',
            length: '20',
          },
          {
            name: 'status',
            type: 'contact_status_enum',
            default: "'active'",
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'profilePictureUrl',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'lastMessageAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'lastMessageDirection',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'messageCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'optedOutAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'blockedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'blockReason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'customFields',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Indexes for whatsapp_contacts
    await queryRunner.createIndex(
      'whatsapp_contacts',
      new TableIndex({
        name: 'IDX_WHATSAPP_CONTACTS_ORG_PHONE',
        columnNames: ['organizationId', 'phoneNumber'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'whatsapp_contacts',
      new TableIndex({
        name: 'IDX_WHATSAPP_CONTACTS_STATUS',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'whatsapp_contacts',
      new TableIndex({
        name: 'IDX_WHATSAPP_CONTACTS_LAST_MESSAGE',
        columnNames: ['lastMessageAt'],
      }),
    );

    // Foreign key
    await queryRunner.createForeignKey(
      'whatsapp_contacts',
      new TableForeignKey({
        columnNames: ['organizationId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables
    await queryRunner.dropTable('whatsapp_contacts');
    await queryRunner.dropTable('whatsapp_templates');
    await queryRunner.dropTable('whatsapp_messages');

    // Drop enums
    await queryRunner.query(`DROP TYPE "contact_status_enum"`);
    await queryRunner.query(`DROP TYPE "template_language_enum"`);
    await queryRunner.query(`DROP TYPE "template_status_enum"`);
    await queryRunner.query(`DROP TYPE "template_category_enum"`);
    await queryRunner.query(`DROP TYPE "message_direction_enum"`);
    await queryRunner.query(`DROP TYPE "message_status_enum"`);
    await queryRunner.query(`DROP TYPE "message_type_enum"`);
  }
}
