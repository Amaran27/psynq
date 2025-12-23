import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQualifyTimeoutToPsContacts1766325000000 implements MigrationInterface {
    name = 'AddQualifyTimeoutToPsContacts1766325000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ps_contacts" ADD COLUMN IF NOT EXISTS "qualify_timeout" float`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ps_contacts" DROP COLUMN "qualify_timeout"`);
    }
}
