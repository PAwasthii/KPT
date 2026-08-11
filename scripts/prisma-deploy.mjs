/**
 * Render-safe Prisma migration script.
 *
 * On first deploy against an existing Supabase database, Prisma throws P3005
 * ("database schema is not empty") because the schema exists but the
 * _prisma_migrations history table has never been populated.
 *
 * This script detects that case, baselines every existing migration as
 * "already applied", then runs migrate deploy normally.  On all subsequent
 * deploys migrate deploy runs directly (no baseline needed).
 */
import { spawnSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const SCHEMA = 'packages/db/prisma/schema.prisma';
const MIGRATIONS_DIR = 'packages/db/prisma/migrations';

function run(args) {
  return spawnSync('npx', ['prisma', ...args, `--schema=${SCHEMA}`], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

function flush(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

// ── 1. Attempt normal migrate deploy ────────────────────────────────────────
console.log('Running prisma migrate deploy...');
const first = run(['migrate', 'deploy']);
flush(first);

if (first.status === 0) {
  console.log('✅ Migrations deployed successfully.');
  process.exit(0);
}

const output = (first.stdout ?? '') + (first.stderr ?? '');

if (!output.includes('P3005')) {
  console.error('❌ Migration failed with an unexpected error.');
  process.exit(first.status ?? 1);
}

// ── 2. P3005: baseline all existing migrations ───────────────────────────────
console.log('\nP3005 detected — baselining existing migrations...');

const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((name) => {
    try { return statSync(join(MIGRATIONS_DIR, name)).isDirectory(); } catch { return false; }
  })
  .sort();

for (const migration of migrations) {
  const r = run(['migrate', 'resolve', '--applied', migration]);
  if (r.status === 0) {
    console.log(`  ✓ ${migration}`);
  } else {
    // Already tracked — not an error, just skip
    console.log(`  – ${migration} (already tracked)`);
  }
}

// ── 3. Retry deploy for any genuinely new migrations ────────────────────────
console.log('\nRetrying migrate deploy after baseline...');
const second = run(['migrate', 'deploy']);
flush(second);

if (second.status !== 0) {
  console.error('❌ Migration failed after baselining.');
  process.exit(second.status ?? 1);
}

console.log('✅ Migrations deployed successfully after baseline.');
