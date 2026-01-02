import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRealtimeDialplan1766329000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Standard Asterisk Extensions Table
    await queryRunner.query(`
            CREATE TABLE "extensions" (
                "id" SERIAL PRIMARY KEY,
                "context" TEXT NOT NULL,
                "exten" TEXT NOT NULL,
                "priority" INTEGER NOT NULL DEFAULT 1,
                "app" TEXT NOT NULL,
                "appdata" TEXT
            )
        `);
    await queryRunner.query(
      `CREATE INDEX "idx_extensions_context" ON "extensions" ("context")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "extensions"`);
  }
}
