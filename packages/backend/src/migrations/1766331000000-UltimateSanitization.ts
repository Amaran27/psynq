import { MigrationInterface, QueryRunner } from "typeorm";

export class UltimateSanitization1766331000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Correct cleanup based on actual types
        await queryRunner.query(`DROP VIEW IF EXISTS ps_endpoints CASCADE`);
        await queryRunner.query(`DROP VIEW IF EXISTS ps_auths CASCADE`);
        await queryRunner.query(`DROP VIEW IF EXISTS ps_aors CASCADE`);
        await queryRunner.query(`DROP VIEW IF EXISTS ps_globals CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS ps_registrations CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS ps_identifies CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS extensions CASCADE`);

        const tables = [
            'ps_endpoints', 'ps_auths', 'ps_aors', 'ps_globals', 
            'ps_registrations', 'ps_identifies', 'extensions'
        ];

        for (const table of tables) {
            const dataTable = `${table}_data`;
            
            // Check if data table exists
            const tableExists = await queryRunner.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = '${dataTable}'
                )
            `);

            if (!tableExists[0].exists) {
                console.log(`Skipping ${table} because ${dataTable} does not exist.`);
                continue;
            }

            // Get all columns for this table
            const columnsResult = await queryRunner.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = '${dataTable}'
            `);
            
            const selectClause = columnsResult.map((col: any) => {
                const name = col.column_name;
                // Aggressively trim EVERY text column
                return `TRIM(BOTH FROM CAST("${name}" AS TEXT)) AS "${name}"`;
            }).join(', ');

            await queryRunner.query(`
                CREATE VIEW ${table} AS 
                SELECT ${selectClause} 
                FROM ${dataTable}
            `);
        }
        
        console.log('Ultimate Sanitization Views Created.');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No-op for down to keep it safe
    }
}
