import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupervisorParticipantSid1760764800000 implements MigrationInterface {
  name = 'AddSupervisorParticipantSid1760764800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "calls" ADD COLUMN "supervisorParticipantSid" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "calls" DROP COLUMN "supervisorParticipantSid"`,
    );
  }
}
