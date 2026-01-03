import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import { UserRole, UserEntity } from '../entities/user.entity';
import { AgentStatus } from '@psynq/core';
import { DataSource } from 'typeorm';

/**
 * Seeds authentication and user data for development/testing.
 * 
 * Creates:
 * - System administrator (sysadmin)
 * - Organization administrator (admin)
 * - Supervisor users (supervisor1, supervisor2)
 * - Agent users (agent1, agent2, agent3)
 * 
 * Run: npm run seed or node -r ts-node/register src/scripts/seed-auth.ts
 */
async function seedAuthData() {
  console.log('🌱 Seeding Auth Data...\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);
  const dataSource = app.get(DataSource);
  const userRepo = dataSource.getRepository(UserEntity);

  try {
    // Seed data structure
    const seedUsers = [
      {
        username: 'sysadmin',
        password: process.env.SYSADMIN_PASSWORD || 'PsynqAdmin2025!!',
        roles: [UserRole.SYSTEM_ADMIN],
        firstName: 'System',
        lastName: 'Administrator',
        email: 'sysadmin@psynq.local',
        status: AgentStatus.OFFLINE,
      },
      {
        username: 'admin',
        password: process.env.ADMIN_PASSWORD || 'AdminPass2025!!',
        roles: [UserRole.ADMIN],
        firstName: 'Organization',
        lastName: 'Admin',
        email: 'admin@psynq.local',
        status: AgentStatus.OFFLINE,
      },
      {
        username: 'supervisor1',
        password: 'SuperPass2025!!',
        roles: [UserRole.SUPERVISOR],
        firstName: 'Sarah',
        lastName: 'Supervisor',
        email: 'sarah.supervisor@psynq.local',
        status: AgentStatus.OFFLINE,
        skills: JSON.stringify(['quality-monitoring', 'coaching', 'reporting']),
      },
      {
        username: 'supervisor2',
        password: 'SuperPass2025!!',
        roles: [UserRole.SUPERVISOR],
        firstName: 'Mike',
        lastName: 'Manager',
        email: 'mike.manager@psynq.local',
        status: AgentStatus.OFFLINE,
        skills: JSON.stringify(['team-lead', 'escalation', 'training']),
      },
      {
        username: 'agent1',
        password: 'AgentPass2025!!',
        roles: [UserRole.AGENT],
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@psynq.local',
        status: AgentStatus.AVAILABLE,
        skills: JSON.stringify(['sales', 'customer-service', 'english']),
      },
      {
        username: 'agent2',
        password: 'AgentPass2025!!',
        roles: [UserRole.AGENT],
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bob@psynq.local',
        status: AgentStatus.AVAILABLE,
        skills: JSON.stringify(['technical-support', 'troubleshooting', 'english', 'spanish']),
      },
      {
        username: 'agent3',
        password: 'AgentPass2025!!',
        roles: [UserRole.AGENT],
        firstName: 'Carol',
        lastName: 'Davis',
        email: 'carol@psynq.local',
        status: AgentStatus.OFFLINE,
        skills: JSON.stringify(['billing', 'collections', 'english', 'french']),
      },
    ];

    console.log('Creating/updating users...\n');

    for (const userData of seedUsers) {
      try {
        // Check if user exists
        let user = await userRepo.findOneBy({ username: userData.username });

        if (user) {
          console.log(`✓ User ${userData.username} already exists, updating...`);
          
          // Update existing user
          user.roles = userData.roles;
          user.firstName = userData.firstName;
          user.lastName = userData.lastName;
          user.email = userData.email;
          user.status = userData.status;
          if (userData.skills) {
            user.skills = JSON.parse(userData.skills);
          }
          
          await userRepo.save(user);
          console.log(`  ✓ Updated ${userData.username} (${userData.roles.join(', ')})\n`);
        } else {
          // Register new user
          const registered = await authService.register({
            username: userData.username,
            password: userData.password,
            email: `${userData.username}@example.com`,
            roles: userData.roles,
            organizationId: undefined,
          });

          // Update additional fields
          user = await userRepo.findOneBy({ id: (registered as any).id });
          if (user) {
            user.firstName = userData.firstName;
            user.lastName = userData.lastName;
            user.email = userData.email;
            user.status = userData.status;
            if (userData.skills) {
              user.skills = JSON.parse(userData.skills);
            }
            await userRepo.save(user);
          }

          console.log(`  ✓ Created ${userData.username} (${userData.roles.join(', ')})`);
          console.log(`    Password: ${userData.password}\n`);
        }
      } catch (error) {
        console.error(`  ✗ Failed to seed ${userData.username}:`, error.message);
      }
    }

    console.log('\n📊 Seed Summary:');
    const totalUsers = await userRepo.count();
    const adminCount = await userRepo.count({ where: { roles: UserRole.SYSTEM_ADMIN } });
    const supervisorCount = await userRepo.count({ where: { roles: UserRole.SUPERVISOR } });
    
    console.log(`  Total Users: ${totalUsers}`);
    console.log(`  Admins: ${adminCount}`);
    console.log(`  Supervisors: ${supervisorCount}`);
    console.log(`  Agents: ${totalUsers - adminCount - supervisorCount}`);

    console.log('\n✅ Auth data seeding complete!\n');
    console.log('🔑 Default Credentials:');
    console.log('   System Admin: sysadmin / PsynqAdmin2025!!');
    console.log('   Org Admin:    admin / AdminPass2025!!');
    console.log('   Supervisor:   supervisor1 / SuperPass2025!!');
    console.log('   Agent:        agent1 / AgentPass2025!!\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

// Run if executed directly
if (require.main === module) {
  seedAuthData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedAuthData };
