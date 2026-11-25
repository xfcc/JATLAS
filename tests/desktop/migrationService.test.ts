import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  CURRENT_DATABASE_SCHEMA_VERSION,
  backupDatabaseBeforeMigration,
  getDatabaseMigrationStatus,
  markDatabaseSchemaCurrent,
} from '../../apps/desktop/core/migrationService';

describe('database migration service', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jatlas-migration-service-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  const databaseUrl = (fileName = 'jatlas.db') => `file:${path.join(tempDir, fileName)}`;

  async function createLegacyDatabase(url: string) {
    const client = new PrismaClient({ datasources: { db: { url } } });
    try {
      await client.$executeRawUnsafe(`
        CREATE TABLE "Tier" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "name" TEXT NOT NULL,
          "video_limit" INTEGER
        )
      `);
      await client.$executeRawUnsafe(`INSERT INTO "Tier" ("name", "video_limit") VALUES ('S', 100)`);
    } finally {
      await client.$disconnect();
    }
  }

  it('requires confirmation for a non-empty legacy database without schema metadata', async () => {
    const url = databaseUrl();
    await createLegacyDatabase(url);

    const status = await getDatabaseMigrationStatus({ dbMode: 'sqlite', databaseUrl: url });

    expect(status.required).toBe(true);
    expect(status.currentVersion).toBe(0);
    expect(status.targetVersion).toBe(CURRENT_DATABASE_SCHEMA_VERSION);
    expect(status.steps).toContain('备份当前数据库文件');
    expect(status.steps).toContain('补齐当前版本需要的表结构和字段');
  });

  it('does not require confirmation for a database already marked current', async () => {
    const url = databaseUrl();
    await createLegacyDatabase(url);
    await markDatabaseSchemaCurrent({ dbMode: 'sqlite', databaseUrl: url });

    const status = await getDatabaseMigrationStatus({ dbMode: 'sqlite', databaseUrl: url });

    expect(status.required).toBe(false);
    expect(status.currentVersion).toBe(CURRENT_DATABASE_SCHEMA_VERSION);
  });

  it('creates a timestamped backup next to the database before migration', async () => {
    const url = databaseUrl('library.db');
    await createLegacyDatabase(url);

    const backupPath = await backupDatabaseBeforeMigration({ dbMode: 'sqlite', databaseUrl: url });
    const [sourceStat, backupStat] = await Promise.all([fs.stat(path.join(tempDir, 'library.db')), fs.stat(backupPath)]);

    expect(path.dirname(backupPath)).toBe(tempDir);
    expect(path.basename(backupPath)).toMatch(/^library\.before-migration\.\d{8}-\d{6}\.db$/);
    expect(backupStat.size).toBe(sourceStat.size);
  });
});
