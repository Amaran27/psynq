import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePsGlobalsTable1766324000000 implements MigrationInterface {
  name = 'CreatePsGlobalsTable1766324000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "ps_globals" (
                "id" TEXT PRIMARY KEY,
                "user_agent" TEXT,
                "default_outbound_endpoint" TEXT,
                "debug" TEXT,
                "endpoint_identifier_order" TEXT,
                "max_forwards" INTEGER,
                "keep_alive_interval" INTEGER,
                "contact_expiration_check_interval" INTEGER,
                "default_realm" TEXT
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "ps_globals"`);
  }
}
