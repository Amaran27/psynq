const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'src', 'migrations');

function listMigrations() {
  return fs.existsSync(MIGRATIONS_DIR) ? fs.readdirSync(MIGRATIONS_DIR).sort() : [];
}

(async () => {
  const before = listMigrations();
  console.log('Migrations before:', before.length);

  // Run TypeORM migration:generate into a DRIFT_CHECK target name
  const tsNode = process.execPath; // node
  const cliPath = path.resolve(__dirname, '..', 'node_modules', 'typeorm', 'cli.js');
  const name = `DRIFT_CHECK_${Date.now()}`;
  console.log(`Generating migration with name ${name} to detect drift...`);

  const result = spawnSync(tsNode, ['-r', 'ts-node/register', cliPath, 'migration:generate', '-d', 'src/data-source.ts', `src/migrations/${name}`], {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  });

  // Collect output
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);

  const after = listMigrations();
  console.log('Migrations after:', after.length);

  const newFiles = after.filter(f => !before.includes(f));
  const createdDriftFiles = newFiles.filter(f => f.includes('DRIFT_CHECK_'));

  if (createdDriftFiles.length > 0) {
    console.error('Model/migration drift detected. Generated migration files:', createdDriftFiles);
    // Clean up generated drift files
    createdDriftFiles.forEach(f => {
      try {
        fs.unlinkSync(path.join(MIGRATIONS_DIR, f));
      } catch (err) {
        console.warn('Failed to delete generated drift file', f, err.message);
      }
    });
    console.error('\nAction required: There are model changes that are not captured in migrations.\nGenerate a migration (e.g., `npm run migration:generate`) and commit the generated migration before merging this PR.');
    process.exit(2);
  }

  // If TypeORM reported "No changes were found" it exits non-zero sometimes; but if no files were created we're good.
  console.log('No migration drift detected.');
  process.exit(0);
})();
