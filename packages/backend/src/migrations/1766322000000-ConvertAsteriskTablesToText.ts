import { MigrationInterface, QueryRunner } from "typeorm";

export class ConvertAsteriskTablesToText1766322000000 implements MigrationInterface {
    name = 'ConvertAsteriskTablesToText1766322000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Convert PJSIP columns to TEXT to avoid fixed-width padding issues in ODBC
        
        // ps_endpoints
        await queryRunner.query(`ALTER TABLE "ps_endpoints" ALTER COLUMN "id" TYPE TEXT`);
        await queryRunner.query(`ALTER TABLE "ps_endpoints" ALTER COLUMN "transport" TYPE TEXT`);
        await queryRunner.query(`ALTER TABLE "ps_endpoints" ALTER COLUMN "aors" TYPE TEXT`);
        await queryRunner.query(`ALTER TABLE "ps_endpoints" ALTER COLUMN "auth" TYPE TEXT`);
        await queryRunner.query(`ALTER TABLE "ps_endpoints" ALTER COLUMN "context" TYPE TEXT`);
        await queryRunner.query(`ALTER TABLE "ps_endpoints" ALTER COLUMN "allow" TYPE TEXT`);
        await queryRunner.query(`ALTER TABLE "ps_endpoints" ALTER COLUMN "disallow" TYPE TEXT`);

        // ps_auths
        await queryRunner.query(`ALTER TABLE "ps_auths" ALTER COLUMN "id" TYPE TEXT`);
        await queryRunner.query(`ALTER TABLE "ps_auths" ALTER COLUMN "username" TYPE TEXT`);
        await queryRunner.query(`ALTER TABLE "ps_auths" ALTER COLUMN "password" TYPE TEXT`);
        await queryRunner.query(`ALTER TABLE "ps_auths" ALTER COLUMN "realm" TYPE TEXT`);

        // ps_aors
        await queryRunner.query(`ALTER TABLE "ps_aors" ALTER COLUMN "id" TYPE TEXT`);

        // ps_contacts
        await queryRunner.query(`ALTER TABLE "ps_contacts" ALTER COLUMN "id" TYPE TEXT`);
        await queryRunner.query(`ALTER TABLE "ps_contacts" ALTER COLUMN "endpoint" TYPE TEXT`);
        await queryRunner.query(`ALTER TABLE "ps_contacts" ALTER COLUMN "uri" TYPE TEXT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverting to varchar would require specific lengths, leaving as TEXT is generally safer
    }
}
