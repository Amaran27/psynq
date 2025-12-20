import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { OrganizationService } from '../modules/organization/organization.service';
import { AuthService } from '../auth/auth.service';
import { UserRole, UserEntity } from '../entities/user.entity';
import { DataSource } from 'typeorm';
import { SettingsService } from '../services/settings.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const orgService = app.get(OrganizationService);
  const authService = app.get(AuthService);
  const dataSource = app.get(DataSource);
  
  const SYSTEM_ORG_NAME = 'Master System';
  const SYSTEM_ORG_SLUG = 'system';

  console.log('--- Psynq System Seeding Protocol ---');

  try {
    let systemOrg;
    try {
      systemOrg = await orgService.findBySlug(SYSTEM_ORG_SLUG);
      console.log(`[OK] System Organization already exists: ${systemOrg.id}`);
    } catch (e) {
      systemOrg = await orgService.create(SYSTEM_ORG_NAME, SYSTEM_ORG_SLUG);
      console.log(`[CREATED] System Organization created: ${systemOrg.id}`);
    }

    const adminUsername = process.env.SYSTEM_ADMIN_USER || 'sysadmin';
    const adminPassword = process.env.SYSTEM_ADMIN_PASS || 'PsynqSecure2025!!';

    const userRepo = dataSource.getRepository(UserEntity);
    let user = await userRepo.findOneBy({ username: adminUsername });

    if (!user) {
        const registered = await authService.register({
            username: adminUsername,
            password: adminPassword,
        });
        user = await userRepo.findOneBy({ id: (registered as any).id });
        console.log(`[CREATED] User ${adminUsername} registered.`);
    }

    if (user) {
        user.roles = [UserRole.SYSTEM_ADMIN];
        user.organizationId = systemOrg.id;
        await userRepo.save(user);
        console.log(`[UPDATED] User ${adminUsername} promoted to SYSTEM_ADMIN and linked to org ${systemOrg.slug}`);
    }

    // Seed Default System Settings
    const settingsService = app.get(SettingsService);
    const defaultSettings = [
        { key: 'telephony.provider', value: 'asterisk', isSecret: false },
        { key: 'storage.provider', value: 'local', isSecret: false },
    ];

    for (const s of defaultSettings) {
        try {
            const existing = await settingsService.getSetting(null, s.key);
            if (!existing) {
                await settingsService.setSetting(null, s.key, s.value, s.isSecret);
                console.log(`[SEED] System Setting ${s.key} = ${s.value}`);
            }
        } catch (e) {
            console.warn(`[SKIP] Failed to seed setting ${s.key}: ${e.message}`);
        }
    }

    console.log('Seeding complete. You can now log in via the UI.');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
