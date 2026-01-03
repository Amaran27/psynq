import { genSalt, hash } from 'bcrypt';
import AppDataSource from '../data-source';
import { UserEntity } from '../entities/user.entity';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initializeDataSourceWithRetry(
  attempts: number,
  delayMs: number,
): Promise<void> {
  let lastError: unknown;

  for (let i = 1; i <= attempts; i++) {
    try {
      await AppDataSource.initialize();
      return;
    } catch (err) {
      lastError = err;
      console.warn(
        `[WAIT] DB not ready yet (attempt ${i}/${attempts}). Retrying in ${delayMs}ms...`,
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}

async function resetUserPassword() {
  const username = process.env.RESET_USERNAME || 'sysadmin';
  const newPassword =
    process.env.RESET_PASSWORD ||
    process.env.SYSTEM_ADMIN_PASS ||
    process.env.SYSADMIN_PASSWORD ||
    'PsynqSecure2025!!';

  const saltRounds = Number(process.env.BCRYPT_ROUNDS || 10);

  console.log('--- Psynq Dev Utility: Reset User Password ---');
  console.log(`[INFO] Target username: ${username}`);

  await initializeDataSourceWithRetry(30, 2000);

  try {
    const repo = AppDataSource.getRepository(UserEntity);
    const user = await repo.findOneBy({ username });

    if (!user) {
      throw new Error(
        `User '${username}' not found. (Tip: run seed scripts or create the user first.)`,
      );
    }

    const salt = await genSalt(saltRounds);
    user.password = await hash(newPassword, salt);
    await repo.save(user);

    console.log(`[OK] Password updated for user '${username}'.`);
    console.log(
      `[NOTE] This is intended for development/test automation only; do not use in production.`,
    );
  } finally {
    await AppDataSource.destroy().catch(() => undefined);
  }
}

if (require.main === module) {
  resetUserPassword()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[FAIL] Password reset failed:', err);
      process.exit(1);
    });
}

export { resetUserPassword };
