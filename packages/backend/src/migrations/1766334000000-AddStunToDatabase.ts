import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStunToDatabase1766334000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Add column to data table
        await queryRunner.query(`ALTER TABLE "ps_endpoints_data" ADD COLUMN IF NOT EXISTS "stunaddr" TEXT`);
        
        // 2. Update existing users to use Google STUN
        await queryRunner.query(`UPDATE "ps_endpoints_data" SET "stunaddr" = 'stun.l.google.com:19302' WHERE webrtc = 'yes'`);

        // 3. Recreate the View to include the new column
        await queryRunner.query(`DROP VIEW IF EXISTS ps_endpoints CASCADE`);
        
        const columnsResult = await queryRunner.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'ps_endpoints_data'
        `);
        
        const selectClause = columnsResult.map((col: any) => {
            const name = col.column_name;
            return `TRIM(BOTH FROM CAST("${name}" AS TEXT)) AS "${name}"`;
        }).join(', ');

        await queryRunner.query(`
            CREATE VIEW ps_endpoints AS 
            SELECT ${selectClause} 
            FROM ps_endpoints_data
        `);
        
        console.log('STUN server applied to all WebRTC endpoints in DB.');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
