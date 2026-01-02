import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExtensionsData1766333000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Data Table
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "extensions_data" (
                "id" SERIAL PRIMARY KEY,
                "context" TEXT NOT NULL,
                "exten" TEXT NOT NULL,
                "priority" INTEGER NOT NULL DEFAULT 1,
                "app" TEXT NOT NULL,
                "appdata" TEXT
            )
        `);

    // 2. Create Sanitized View
    await queryRunner.query(`DROP VIEW IF EXISTS extensions`);
    await queryRunner.query(`
            CREATE VIEW extensions AS 
            SELECT 
                "id",
                TRIM(BOTH FROM "context") AS "context",
                TRIM(BOTH FROM "exten") AS "exten",
                "priority",
                TRIM(BOTH FROM "app") AS "app",
                TRIM(BOTH FROM "appdata") AS "appdata"
            FROM extensions_data
        `);

    // 3. Seed basic routing
    await queryRunner.query(`
            INSERT INTO extensions_data (context, exten, priority, app, appdata)
            VALUES ('from-webrtc', '_X.', 1, 'Stasis', 'psynq-app')
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS extensions`);
    await queryRunner.query(`DROP TABLE IF EXISTS extensions_data`);
  }
}
