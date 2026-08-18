import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { DesktopRuntimeConfig } from '../../apps/desktop/core/configService';
import {
  clearDesktopPreviousRuntimeConfig,
  loadDesktopPreviousRuntimeConfig,
  loadDesktopRuntimeConfig,
  normalizeDesktopThemeMode,
  saveDesktopPreviousRuntimeConfig,
  saveDesktopRuntimeConfig,
} from '../../apps/desktop/core/configService';

describe('desktop runtime config', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jatlas-desktop-config-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('persists storage paths per category id', async () => {
    const config: DesktopRuntimeConfig = {
      dbMode: 'sqlite',
      databaseUrl: 'file:/tmp/jatlas.db',
      tierStoragePaths: {
        '1': '/Volumes/JAV_output/S',
        '2': '/Volumes/JAV_output/A',
      },
    };

    await saveDesktopRuntimeConfig(tempDir, config);

    await expect(loadDesktopRuntimeConfig(tempDir)).resolves.toEqual(config);
  });

  it('persists the selected terminal theme mode', async () => {
    const config: DesktopRuntimeConfig = {
      dbMode: 'sqlite',
      databaseUrl: 'file:/tmp/jatlas.db',
      themeMode: 'light',
    };

    await saveDesktopRuntimeConfig(tempDir, config);

    await expect(loadDesktopRuntimeConfig(tempDir)).resolves.toEqual(config);
    const mode = (await fs.stat(path.join(tempDir, 'desktop-config.json'))).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('keeps and clears the previous config during a pending database switch', async () => {
    const config: DesktopRuntimeConfig = {
      dbMode: 'sqlite',
      databaseUrl: 'file:/tmp/original.db',
    };

    await saveDesktopPreviousRuntimeConfig(tempDir, config);
    await expect(loadDesktopPreviousRuntimeConfig(tempDir)).resolves.toEqual(config);

    await clearDesktopPreviousRuntimeConfig(tempDir);
    await expect(loadDesktopPreviousRuntimeConfig(tempDir)).resolves.toBeNull();
  });

  it('normalizes missing or invalid theme modes to dark mode', () => {
    expect(normalizeDesktopThemeMode(undefined)).toBe('dark');
    expect(normalizeDesktopThemeMode('light')).toBe('light');
    expect(normalizeDesktopThemeMode('invalid')).toBe('dark');
  });
});
