import { execFile } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { initializeDatabaseForDesktop } from '../../apps/desktop/core/bootstrapService';

const mockExecuteRawUnsafe = jest.fn();
const mockQueryRawUnsafe = jest.fn();
const mockDisconnect = jest.fn();

jest.mock('child_process', () => ({
  execFile: jest.fn((_file, _args, _options, callback) => {
    callback(null, { stdout: '', stderr: '' });
  }),
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $executeRawUnsafe: mockExecuteRawUnsafe,
    $queryRawUnsafe: mockQueryRawUnsafe,
    $disconnect: mockDisconnect,
  })),
}));

describe('initializeDatabaseForDesktop', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jatlas-desktop-bootstrap-'));
    jest.clearAllMocks();
    mockQueryRawUnsafe.mockResolvedValue([]);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('runs Prisma schema sync and total limit backfill when the SQLite database already exists', async () => {
    const dbPath = path.join(tempDir, 'jatlas.db');
    await fs.writeFile(dbPath, 'sqlite-bytes');

    await initializeDatabaseForDesktop({ dbMode: 'sqlite', databaseUrl: `file:${dbPath}` }, process.cwd());

    expect(execFile).not.toHaveBeenCalled();
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS "Tier"'));
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS "Actress"'));
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS "AssetLog"'));
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('total_video_limit'));
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('WHEN TRIM("career_to") <> \'\' THEN \'retired\''));
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('"career_from"'));
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('"asset_updated_at" = "updated_at"'));
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS "_jatlas_meta"'));
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining("'schema_version'"));
    expect(mockDisconnect).toHaveBeenCalledTimes(7);
  });

  it('initializes an empty SQLite database without spawning Prisma CLI', async () => {
    const dbPath = path.join(tempDir, 'jatlas.db');
    await fs.writeFile(dbPath, '');

    await initializeDatabaseForDesktop({ dbMode: 'sqlite', databaseUrl: `file:${dbPath}` }, process.cwd());

    expect(execFile).not.toHaveBeenCalled();
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS "Tier"'));
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS "Actress"'));
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS "AssetLog"'));
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('COALESCE("Tier"."video_limit", 100)'));
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('"Actress"'));
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('"birthday"'));
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('"asset_updated_at" = "updated_at"'));
    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS "_jatlas_meta"'));
  });
});
