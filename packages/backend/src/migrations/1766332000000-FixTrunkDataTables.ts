import { MigrationInterface, QueryRunner } from "typeorm";

export class FixTrunkDataTables1766332000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create ps_registrations_data
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ps_registrations_data" (
                "id" TEXT PRIMARY KEY,
                "client_uri" TEXT,
                "server_uri" TEXT,
                "outbound_auth" TEXT,
                "transport" TEXT,
                "contact_user" TEXT,
                "retry_interval" INTEGER DEFAULT 60,
                "expiration" INTEGER DEFAULT 3600
            )
        `);

        // Create ps_identifies_data
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "ps_identifies_data" (
                "id" TEXT PRIMARY KEY,
                "endpoint" TEXT,
                "match" TEXT
            )
        `);

        // Refresh views (this will now pick up the new _data tables)
        await queryRunner.query(`DROP VIEW IF EXISTS ps_registrations, ps_identifies`);
        await queryRunner.query(`CREATE VIEW ps_registrations AS SELECT * FROM ps_registrations_data`);
        await queryRunner.query(`CREATE VIEW ps_identifies AS SELECT * FROM ps_identifies_data`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }
}
