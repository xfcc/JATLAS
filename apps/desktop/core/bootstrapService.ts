import { PrismaClient } from '@prisma/client';
import type { DesktopRuntimeConfig } from './configService';
import {
  ensureDatabaseDirectory,
  hasExistingDatabase,
  markDatabaseSchemaCurrent,
} from './migrationService';
import type { DatabaseMigrationStatus } from './migrationService';

export type DesktopBootstrapState = {
  configured: boolean;
  initialized: boolean;
  configPath: string;
  message: string;
  migration?: DatabaseMigrationStatus & { backupPath?: string };
};

type ColumnDefinition = {
  name: string;
  sql: string;
};

async function getTableColumns(client: PrismaClient, tableName: string): Promise<Set<string>> {
  const rows = await client.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("${tableName}")`);
  return new Set(rows.map((row) => row.name));
}

async function hasActressColumn(databaseUrl: string, columnName: string): Promise<boolean> {
  if (!(await hasExistingDatabase(databaseUrl))) return false;
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  try {
    return (await getTableColumns(client, 'Actress')).has(columnName);
  } catch {
    return false;
  } finally {
    await client.$disconnect();
  }
}

async function ensureColumns(client: PrismaClient, tableName: string, columns: ColumnDefinition[]) {
  const existing = await getTableColumns(client, tableName);
  for (const column of columns) {
    if (!existing.has(column.name)) {
      await client.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD COLUMN ${column.sql}`);
    }
  }
}

async function ensureDesktopSchema(databaseUrl: string) {
  await ensureDatabaseDirectory(databaseUrl);
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  try {
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Tier" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "video_limit" INTEGER,
        "total_video_limit" INTEGER,
        "status" TEXT NOT NULL DEFAULT 'active',
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL
      )
    `);
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Actress" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "name" TEXT NOT NULL,
        "tierId" INTEGER NOT NULL,
        "video_count" INTEGER NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'active',
        "emby_id" TEXT NOT NULL DEFAULT '[]',
        "roman" TEXT NOT NULL DEFAULT '',
        "aliases" TEXT NOT NULL DEFAULT '[]',
        "birthday" TEXT NOT NULL DEFAULT '',
        "cup" TEXT NOT NULL DEFAULT '',
        "bust" TEXT NOT NULL DEFAULT '',
        "waist" TEXT NOT NULL DEFAULT '',
        "hip" TEXT NOT NULL DEFAULT '',
        "career_from" TEXT NOT NULL DEFAULT '',
        "career_to" TEXT NOT NULL DEFAULT '',
        "minnano_url" TEXT NOT NULL DEFAULT '',
        "avatar_path" TEXT NOT NULL DEFAULT '',
        "measurements" TEXT NOT NULL DEFAULT '',
        "birth_date" TEXT NOT NULL DEFAULT '',
        "career_period" TEXT NOT NULL DEFAULT '',
        "cup_size" TEXT NOT NULL DEFAULT '',
        "height" TEXT NOT NULL DEFAULT '',
        "tags" TEXT NOT NULL DEFAULT '[]',
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "asset_updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL,
        CONSTRAINT "Actress_tierId_fkey" FOREIGN KEY ("tierId") REFERENCES "Tier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      )
    `);
    await client.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AssetLog" (
        "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
        "actress_id" INTEGER NOT NULL,
        "actress_name" TEXT NOT NULL,
        "action_type" TEXT NOT NULL,
        "video_delta" INTEGER NOT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL
      )
    `);
    await ensureColumns(client, 'Tier', [
      { name: 'video_limit', sql: '"video_limit" INTEGER' },
      { name: 'total_video_limit', sql: '"total_video_limit" INTEGER' },
      { name: 'status', sql: '"status" TEXT NOT NULL DEFAULT \'active\'' },
      { name: 'created_at', sql: '"created_at" DATETIME NOT NULL DEFAULT \'1970-01-01 00:00:00\'' },
      { name: 'updated_at', sql: '"updated_at" DATETIME NOT NULL DEFAULT \'1970-01-01 00:00:00\'' },
    ]);
    await ensureColumns(client, 'Actress', [
      { name: 'video_count', sql: '"video_count" INTEGER NOT NULL DEFAULT 0' },
      { name: 'status', sql: '"status" TEXT NOT NULL DEFAULT \'active\'' },
      { name: 'emby_id', sql: '"emby_id" TEXT NOT NULL DEFAULT \'[]\'' },
      { name: 'roman', sql: '"roman" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'aliases', sql: '"aliases" TEXT NOT NULL DEFAULT \'[]\'' },
      { name: 'birthday', sql: '"birthday" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'cup', sql: '"cup" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'bust', sql: '"bust" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'waist', sql: '"waist" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'hip', sql: '"hip" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'career_from', sql: '"career_from" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'career_to', sql: '"career_to" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'minnano_url', sql: '"minnano_url" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'avatar_path', sql: '"avatar_path" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'measurements', sql: '"measurements" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'birth_date', sql: '"birth_date" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'career_period', sql: '"career_period" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'cup_size', sql: '"cup_size" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'height', sql: '"height" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'tags', sql: '"tags" TEXT NOT NULL DEFAULT \'[]\'' },
      { name: 'created_at', sql: '"created_at" DATETIME NOT NULL DEFAULT \'1970-01-01 00:00:00\'' },
      { name: 'asset_updated_at', sql: '"asset_updated_at" DATETIME NOT NULL DEFAULT \'1970-01-01 00:00:00\'' },
      { name: 'updated_at', sql: '"updated_at" DATETIME NOT NULL DEFAULT \'1970-01-01 00:00:00\'' },
    ]);
    await ensureColumns(client, 'AssetLog', [
      { name: 'actress_id', sql: '"actress_id" INTEGER NOT NULL DEFAULT 0' },
      { name: 'actress_name', sql: '"actress_name" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'action_type', sql: '"action_type" TEXT NOT NULL DEFAULT \'\'' },
      { name: 'video_delta', sql: '"video_delta" INTEGER NOT NULL DEFAULT 0' },
      { name: 'created_at', sql: '"created_at" DATETIME NOT NULL DEFAULT \'1970-01-01 00:00:00\'' },
      { name: 'updated_at', sql: '"updated_at" DATETIME NOT NULL DEFAULT \'1970-01-01 00:00:00\'' },
    ]);
    await client.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Tier_name_key" ON "Tier"("name")');
    await client.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Actress_name_key" ON "Actress"("name")');
  } finally {
    await client.$disconnect();
  }
}

async function backfillTierTotalVideoLimits(databaseUrl: string) {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  try {
    await client.$executeRawUnsafe(`
      UPDATE "Tier"
      SET "total_video_limit" = (
        SELECT COUNT(*)
        FROM "Actress"
        WHERE "Actress"."tierId" = "Tier"."id"
      ) * COALESCE("Tier"."video_limit", 100)
      WHERE "total_video_limit" IS NULL
    `);
  } finally {
    await client.$disconnect();
  }
}

async function backfillActressStatuses(databaseUrl: string) {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  try {
    await client.$executeRawUnsafe(`
      UPDATE "Actress"
      SET "status" = CASE
        WHEN TRIM("career_to") <> '' THEN 'retired'
        ELSE 'active'
      END
    `);
  } finally {
    await client.$disconnect();
  }
}

async function backfillActressProfileFields(databaseUrl: string) {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  try {
    await client.$executeRawUnsafe(`
      UPDATE "Actress"
      SET
        "birthday" = CASE WHEN TRIM("birthday") = '' THEN "birth_date" ELSE "birthday" END,
        "cup" = CASE WHEN TRIM("cup") = '' THEN "cup_size" ELSE "cup" END,
        "bust" = CASE
          WHEN TRIM("bust") = '' AND INSTR("measurements", '/') > 0
          THEN SUBSTR("measurements", 1, INSTR("measurements", '/') - 1)
          ELSE "bust"
        END,
        "waist" = CASE
          WHEN TRIM("waist") = '' AND INSTR(SUBSTR("measurements", INSTR("measurements", '/') + 1), '/') > 0
          THEN SUBSTR(
            SUBSTR("measurements", INSTR("measurements", '/') + 1),
            1,
            INSTR(SUBSTR("measurements", INSTR("measurements", '/') + 1), '/') - 1
          )
          ELSE "waist"
        END,
        "hip" = CASE
          WHEN TRIM("hip") = '' AND INSTR(SUBSTR("measurements", INSTR("measurements", '/') + 1), '/') > 0
          THEN SUBSTR(
            SUBSTR("measurements", INSTR("measurements", '/') + 1),
            INSTR(SUBSTR("measurements", INSTR("measurements", '/') + 1), '/') + 1
          )
          ELSE "hip"
        END,
        "career_from" = CASE
          WHEN TRIM("career_from") = '' AND INSTR("career_period", '~') > 0
          THEN SUBSTR("career_period", 1, INSTR("career_period", '~') - 1)
          ELSE "career_from"
        END,
        "career_to" = CASE
          WHEN TRIM("career_to") = '' AND INSTR("career_period", '~') > 0
          THEN SUBSTR("career_period", INSTR("career_period", '~') + 1)
          ELSE "career_to"
        END
    `);
  } finally {
    await client.$disconnect();
  }
}

async function backfillActressAssetUpdatedAt(databaseUrl: string) {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  try {
    await client.$executeRawUnsafe(`
      UPDATE "Actress"
      SET "asset_updated_at" = "updated_at"
    `);
  } finally {
    await client.$disconnect();
  }
}

export async function initializeDatabaseForDesktop(config: DesktopRuntimeConfig, _cwd: string) {
  await hasExistingDatabase(config.databaseUrl);
  const hadAssetUpdatedAt = await hasActressColumn(config.databaseUrl, 'asset_updated_at');
  await ensureDesktopSchema(config.databaseUrl);
  await backfillTierTotalVideoLimits(config.databaseUrl);
  await backfillActressStatuses(config.databaseUrl);
  await backfillActressProfileFields(config.databaseUrl);
  if (!hadAssetUpdatedAt) {
    await backfillActressAssetUpdatedAt(config.databaseUrl);
  }
  await markDatabaseSchemaCurrent(config);
}
