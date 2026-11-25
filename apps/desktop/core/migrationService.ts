import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import type { DesktopRuntimeConfig } from './configService';

export const CURRENT_DATABASE_SCHEMA_VERSION = 8;

export type DatabaseMigrationStatus = {
  required: boolean;
  currentVersion: number;
  targetVersion: number;
  databasePath: string;
  backupDirectory: string;
  steps: string[];
};

export type DatabaseMigrationResult = {
  backupPath: string;
  status: DatabaseMigrationStatus;
};

export function sqlitePathFromDatabaseUrl(databaseUrl: string): string {
  if (!databaseUrl.startsWith('file:')) {
    throw new Error('Only SQLite file: database URLs are supported.');
  }
  return databaseUrl.slice('file:'.length);
}

export async function hasExistingDatabase(databaseUrl: string): Promise<boolean> {
  const dbPath = sqlitePathFromDatabaseUrl(databaseUrl);
  try {
    const stat = await fs.stat(dbPath);
    return stat.isFile() && stat.size > 0;
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? (e as NodeJS.ErrnoException).code : undefined;
    if (code === 'ENOENT') {
      return false;
    }
    throw e;
  }
}

export async function ensureDatabaseDirectory(databaseUrl: string) {
  const dbPath = sqlitePathFromDatabaseUrl(databaseUrl);
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
}

function createMigrationStatus(databaseUrl: string, currentVersion: number): DatabaseMigrationStatus {
  const databasePath = sqlitePathFromDatabaseUrl(databaseUrl);
  return {
    required: currentVersion < CURRENT_DATABASE_SCHEMA_VERSION,
    currentVersion,
    targetVersion: CURRENT_DATABASE_SCHEMA_VERSION,
    databasePath,
    backupDirectory: path.dirname(databasePath),
    steps: [
      '备份当前数据库文件',
      '补齐当前版本需要的表结构和字段',
      '回填旧版本缺失的默认数据',
      '记录新的数据库版本',
    ],
  };
}

async function readDatabaseSchemaVersion(databaseUrl: string): Promise<number> {
  if (!(await hasExistingDatabase(databaseUrl))) {
    return CURRENT_DATABASE_SCHEMA_VERSION;
  }

  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  try {
    const tableRows = await client.$queryRawUnsafe<Array<{ name: string }>>(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_jatlas_meta'`,
    );
    if (tableRows.length === 0) {
      return 0;
    }

    const rows = await client.$queryRawUnsafe<Array<{ value: string }>>(
      `SELECT "value" FROM "_jatlas_meta" WHERE "key" = 'schema_version' LIMIT 1`,
    );
    const version = Number(rows[0]?.value);
    return Number.isInteger(version) && version >= 0 ? version : 0;
  } finally {
    await client.$disconnect();
  }
}

export async function getDatabaseMigrationStatus(config: DesktopRuntimeConfig): Promise<DatabaseMigrationStatus> {
  const currentVersion = await readDatabaseSchemaVersion(config.databaseUrl);
  return createMigrationStatus(config.databaseUrl, currentVersion);
}

function migrationTimestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

export async function backupDatabaseBeforeMigration(config: DesktopRuntimeConfig): Promise<string> {
  const databasePath = sqlitePathFromDatabaseUrl(config.databaseUrl);
  const parsed = path.parse(databasePath);
  const backupPath = path.join(parsed.dir, `${parsed.name}.before-migration.${migrationTimestamp()}${parsed.ext || '.db'}`);
  await fs.copyFile(databasePath, backupPath);
  return backupPath;
}

export async function markDatabaseSchemaCurrent(config: DesktopRuntimeConfig) {
  await ensureDatabaseDirectory(config.databaseUrl);
  const client = new PrismaClient({
    datasources: {
      db: {
        url: config.databaseUrl,
      },
    },
  });
  try {
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_jatlas_meta" (
        "key" TEXT NOT NULL PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.$executeRawUnsafe(`
      INSERT INTO "_jatlas_meta" ("key", "value", "updated_at")
      VALUES ('schema_version', '${CURRENT_DATABASE_SCHEMA_VERSION}', CURRENT_TIMESTAMP)
      ON CONFLICT("key") DO UPDATE SET
        "value" = excluded."value",
        "updated_at" = excluded."updated_at"
    `);
  } finally {
    await client.$disconnect();
  }
}
