import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline migration for Users table (Auth entity).
 * 
 * This migration creates the users table which serves as the authentication entity.
 * No separate auth table is needed - the users table contains all auth-related fields
 * (roles, status, password, etc.).
 * 
 * References: packages/backend/src/auth/AUTH_ENTITY.md
 * 
 * Schema Design:
 * - UUID primary key with uuid_generate_v4()
 * - UNIQUE constraints on username and email
 * - FK to organizations table
 * - RBAC via roles array (agent, supervisor, admin, system_admin)
 * - AgentStatus enum for call center status tracking
 * - Timestamps for status changes and auditing
 */
export class CreateUsersTable1735840000000 implements MigrationInterface {
  name = 'CreateUsersTable1735840000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension if not exists
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    );

    // Create AgentStatus enum
    await queryRunner.query(
      `CREATE TYPE "users_status_enum" AS ENUM(
        'available',
        'offline',
        'on_call',
        'busy',
        'away',
        'break'
      )`,
    );

    // Create UserRole enum  
    await queryRunner.query(
      `CREATE TYPE "users_primaryrole_enum" AS ENUM(
        'agent',
        'supervisor',
        'admin',
        'system_admin'
      )`,
    );

    // Create users table
    await queryRunner.query(
      `CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "username" character varying NOT NULL,
        "email" character varying,
        "password" character varying NOT NULL,
        "firstName" character varying,
        "lastName" character varying,
        "phone" character varying,
        "organizationId" uuid,
        "roles" text NOT NULL DEFAULT '["agent"]'::text,
        "primaryRole" "users_primaryrole_enum",
        "status" "users_status_enum" NOT NULL DEFAULT 'offline',
        "skills" text,
        "lastStatusChangedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )`,
    );

    // Create unique index on username
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_fe0bb3f6520ee0469504521e710" ON "users" ("username")`,
    );

    // Create unique index on email
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_97672ac88f789774dd47f7c8be3" ON "users" ("email")`,
    );

    // Create foreign key to organizations (deferred - org table might not exist yet)
    // This will be added in a follow-up migration after organizations table is created
    // await queryRunner.query(
    //   `ALTER TABLE "users" ADD CONSTRAINT "FK_f3d6aea8fcca58182b2e80ce979" 
    //    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") 
    //    ON DELETE NO ACTION ON UPDATE NO ACTION`,
    // );

    // Create indexes for frequently queried columns
    await queryRunner.query(
      `CREATE INDEX "IDX_users_status" ON "users" ("status")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_users_organizationId" ON "users" ("organizationId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_users_organizationId"`);
    await queryRunner.query(`DROP INDEX "IDX_users_status"`);

    // Drop unique indexes
    await queryRunner.query(`DROP INDEX "UQ_97672ac88f789774dd47f7c8be3"`);
    await queryRunner.query(`DROP INDEX "UQ_fe0bb3f6520ee0469504521e710"`);

    // Drop table
    await queryRunner.query(`DROP TABLE "users"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "users_primaryrole_enum"`);
    await queryRunner.query(`DROP TYPE "users_status_enum"`);
  }
}
