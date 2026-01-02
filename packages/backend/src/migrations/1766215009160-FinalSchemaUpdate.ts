import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinalSchemaUpdate1766215009160 implements MigrationInterface {
  name = 'FinalSchemaUpdate1766215009160';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organizationId" character varying, "key" character varying NOT NULL, "value" jsonb NOT NULL, "isSecret" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c36442ce091cc70ede7e2a8669" ON "settings" ("organizationId", "key") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c36442ce091cc70ede7e2a8669"`,
    );
    await queryRunner.query(`DROP TABLE "settings"`);
  }
}
