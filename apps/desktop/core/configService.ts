import fs from 'fs/promises';
import path from 'path';

export type DesktopRuntimeConfig = {
  dbMode: 'sqlite';
  databaseUrl: string;
  embyServerUrl?: string;
  embyApiKey?: string;
  themeMode?: DesktopThemeMode;
  tierStoragePaths?: Record<string, string>;
  /** Legacy global default path kept so old desktop-config.json files continue to load. */
  storageRootPath?: string;
};

export type DesktopThemeMode = 'dark' | 'light';

export function normalizeDesktopThemeMode(value: unknown): DesktopThemeMode {
  return value === 'light' ? 'light' : 'dark';
}

export function getDesktopConfigPath(userDataPath: string) {
  return path.join(userDataPath, 'desktop-config.json');
}

export function getDesktopPreviousConfigPath(userDataPath: string) {
  return path.join(userDataPath, 'desktop-config.previous.json');
}

async function loadConfigFile(configPath: string): Promise<DesktopRuntimeConfig | null> {
  try {
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw) as DesktopRuntimeConfig;
    if (!parsed?.databaseUrl || parsed.dbMode !== 'sqlite') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function writeConfigFile(configPath: string, config: DesktopRuntimeConfig) {
  const tempPath = `${configPath}.tmp`;
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(tempPath, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: 0o600 });
  await fs.rename(tempPath, configPath);
  await fs.chmod(configPath, 0o600);
}

export async function loadDesktopRuntimeConfig(userDataPath: string): Promise<DesktopRuntimeConfig | null> {
  return loadConfigFile(getDesktopConfigPath(userDataPath));
}

export async function saveDesktopRuntimeConfig(userDataPath: string, config: DesktopRuntimeConfig) {
  const configPath = getDesktopConfigPath(userDataPath);
  await writeConfigFile(configPath, config);
  return configPath;
}

export async function loadDesktopPreviousRuntimeConfig(userDataPath: string) {
  return loadConfigFile(getDesktopPreviousConfigPath(userDataPath));
}

export async function saveDesktopPreviousRuntimeConfig(userDataPath: string, config: DesktopRuntimeConfig) {
  await writeConfigFile(getDesktopPreviousConfigPath(userDataPath), config);
}

export async function clearDesktopPreviousRuntimeConfig(userDataPath: string) {
  await fs.rm(getDesktopPreviousConfigPath(userDataPath), { force: true });
}

export async function clearDesktopRuntimeConfig(userDataPath: string) {
  await fs.rm(getDesktopConfigPath(userDataPath), { force: true });
}

export function applyDesktopRuntimeEnv(config: DesktopRuntimeConfig) {
  process.env.DATABASE_URL = config.databaseUrl;
  if (config.embyServerUrl) {
    process.env.EMBY_SERVER_URL = config.embyServerUrl;
  } else {
    delete process.env.EMBY_SERVER_URL;
  }
  if (config.embyApiKey) {
    process.env.EMBY_API_KEY = config.embyApiKey;
  } else {
    delete process.env.EMBY_API_KEY;
  }
}
