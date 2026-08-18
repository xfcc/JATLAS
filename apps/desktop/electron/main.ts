import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { IPC_CHANNELS } from '../shared/ipc';
import { getDesktopHealthSnapshotCore } from '../core/desktopProbeService';
import {
  applyDesktopRuntimeEnv,
  clearDesktopPreviousRuntimeConfig,
  clearDesktopRuntimeConfig,
  getDesktopConfigPath,
  loadDesktopPreviousRuntimeConfig,
  loadDesktopRuntimeConfig,
  saveDesktopPreviousRuntimeConfig,
  saveDesktopRuntimeConfig,
  type DesktopRuntimeConfig,
} from '../core/configService';
import { initializeDatabaseForDesktop, type DesktopBootstrapState } from '../core/bootstrapService';
import { copyAvatarToUserData, downloadAvatarToUserData } from '../core/avatarService';
import {
  backupDatabaseBeforeMigration,
  getDatabaseMigrationStatus,
  type DatabaseMigrationStatus,
} from '../core/migrationService';
import {
  createDesktopActress,
  createDesktopTier,
  deleteDesktopActress,
  deleteDesktopTier,
  getDesktopActresses,
  getDesktopAssetLogChart,
  getDesktopDashboardStats,
  getDesktopTiers,
  importDesktopTierFoldersAsActresses,
  scanDesktopTierStorage,
  updateDesktopActress,
  updateDesktopTier,
} from '../core/desktopDataService';
import { startDesktopStorageImportTask } from '../core/desktopTaskImportService';
import { getDesktopTaskState, requestCancelDesktopTask } from '../core/desktopTaskStore';
import { resetDesktopPrismaClient } from '../core/prismaClient';
import { fetchMinnanoActressProfile } from '../core/minnanoProfileService';
import {
  startDesktopSyncEmbyIdsTask,
  startDesktopSyncMovieCountsTask,
  startDesktopTierVideoCountSyncTask,
} from '../core/desktopTaskSyncService';

let isDesktopReady = false;

function databaseUrlFromFilePath(filePath: string) {
  return `file:${filePath.replace(/\\/g, '/')}`;
}

function getDefaultDatabaseFile(userDataPath: string) {
  const filePath = path.join(userDataPath, 'jatlas-desktop.db');
  return {
    filePath,
    databaseUrl: databaseUrlFromFilePath(filePath),
  };
}

function ensureDesktopReady() {
  if (!isDesktopReady) {
    throw new Error('请先完成数据库选择与初始化。');
  }
}

function migrationRequiredState(
  configPath: string,
  migration: DatabaseMigrationStatus & { backupPath?: string },
  message = '检测到旧版本数据库，需要先升级数据库。',
): DesktopBootstrapState {
  isDesktopReady = false;
  return {
    configured: true,
    initialized: false,
    configPath,
    message,
    migration,
  };
}

async function initializeConfiguredDatabase(config: DesktopRuntimeConfig, configPath: string, message: string) {
  applyDesktopRuntimeEnv(config);
  const migration = await getDatabaseMigrationStatus(config);
  if (migration.required) {
    return migrationRequiredState(configPath, migration);
  }

  const workspaceRoot = path.resolve(__dirname, '../../../..');
  await initializeDatabaseForDesktop(config, workspaceRoot);
  await resetDesktopPrismaClient();
  isDesktopReady = true;
  return {
    configured: true,
    initialized: true,
    configPath,
    message,
  } satisfies DesktopBootstrapState;
}

function createMainWindow() {
  const preloadPath = path.join(__dirname, 'preload.js');
  const appIconPath = path.resolve(__dirname, '../../../icon.png');
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    icon: appIconPath,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devUrl = process.env.DESKTOP_RENDERER_URL;
  if (devUrl) {
    void mainWindow.loadURL(devUrl);
  } else {
    const indexPath = path.resolve(__dirname, '../../dist/renderer/index.html');
    void mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    const current = mainWindow.webContents.getURL();
    if (current && targetUrl !== current) {
      event.preventDefault();
    }
  });
}

function registerIpcHandlers() {
  ipcMain.handle(IPC_CHANNELS.HEALTH_SNAPSHOT, async () => getDesktopHealthSnapshotCore());
  ipcMain.handle(IPC_CHANNELS.GET_BOOTSTRAP_STATE, async (): Promise<DesktopBootstrapState> => {
    const userDataPath = app.getPath('userData');
    const configPath = getDesktopConfigPath(userDataPath);
    const config = await loadDesktopRuntimeConfig(userDataPath);
    if (!config) {
      return {
        configured: false,
        initialized: false,
        configPath,
        message: 'Desktop config not found. Please complete initial setup.',
      };
    }

    applyDesktopRuntimeEnv(config);
    try {
      return await initializeConfiguredDatabase(config, configPath, 'Desktop config loaded.');
    } catch (e) {
  isDesktopReady = false;
      return {
        configured: true,
        initialized: false,
        configPath,
        message: e instanceof Error ? e.message : '数据库初始化失败。',
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.GET_DEFAULT_DATABASE_FILE, async () => getDefaultDatabaseFile(app.getPath('userData')));

  ipcMain.handle(
    IPC_CHANNELS.SAVE_CONFIG_AND_INIT,
    async (_event, config: DesktopRuntimeConfig): Promise<DesktopBootstrapState> => {
      const userDataPath = app.getPath('userData');
      const configPath = getDesktopConfigPath(userDataPath);
      const previousConfig = await loadDesktopRuntimeConfig(userDataPath);
      const isDatabaseSwitch = Boolean(previousConfig && previousConfig.databaseUrl !== config.databaseUrl);
      applyDesktopRuntimeEnv(config);
      await resetDesktopPrismaClient();
      try {
        const state = await initializeConfiguredDatabase(config, configPath, '配置已保存，数据库已初始化。');
        if (state.migration?.required && isDatabaseSwitch && previousConfig) {
          await saveDesktopPreviousRuntimeConfig(userDataPath, previousConfig);
        } else if (!state.migration?.required) {
          await clearDesktopPreviousRuntimeConfig(userDataPath);
        }
        await saveDesktopRuntimeConfig(userDataPath, config);
        return state;
      } catch (e) {
        if (isDatabaseSwitch && previousConfig) {
          await saveDesktopRuntimeConfig(userDataPath, previousConfig);
          applyDesktopRuntimeEnv(previousConfig);
          await resetDesktopPrismaClient();
          await initializeConfiguredDatabase(previousConfig, configPath, '已恢复原数据库。');
          throw new Error(`数据库切换失败，已恢复原数据库：${e instanceof Error ? e.message : '初始化失败'}`);
        }
  isDesktopReady = false;
        return {
          configured: Boolean(previousConfig),
          initialized: false,
          configPath,
          message: e instanceof Error ? e.message : '数据库初始化失败。',
        };
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.CONFIRM_DATABASE_MIGRATION, async (): Promise<DesktopBootstrapState> => {
    const userDataPath = app.getPath('userData');
    const configPath = getDesktopConfigPath(userDataPath);
    const config = await loadDesktopRuntimeConfig(userDataPath);
    if (!config) {
      return {
        configured: false,
        initialized: false,
        configPath,
        message: 'Desktop config not found. Please complete initial setup.',
      };
    }

    applyDesktopRuntimeEnv(config);
    await resetDesktopPrismaClient();
    let backupPath = '';
    let migration: DatabaseMigrationStatus | null = null;
    try {
      migration = await getDatabaseMigrationStatus(config);
      if (migration.required) {
        backupPath = await backupDatabaseBeforeMigration(config);
      }
      const workspaceRoot = path.resolve(__dirname, '../../../..');
      await initializeDatabaseForDesktop(config, workspaceRoot);
      await resetDesktopPrismaClient();
  isDesktopReady = true;
      await clearDesktopPreviousRuntimeConfig(userDataPath);
      return {
        configured: true,
        initialized: true,
        configPath,
        message: backupPath ? `数据库已升级，备份已保存到：${backupPath}` : '数据库已是当前版本。',
        migration: migration ? { ...migration, required: false, currentVersion: migration.targetVersion, backupPath } : undefined,
      };
    } catch (e) {
  isDesktopReady = false;
      return {
        configured: true,
        initialized: false,
        configPath,
        message: e instanceof Error ? e.message : '数据库升级失败。',
        migration: migration ? { ...migration, backupPath } : undefined,
      };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CANCEL_DATABASE_MIGRATION, async (): Promise<DesktopBootstrapState> => {
    const userDataPath = app.getPath('userData');
    const configPath = getDesktopConfigPath(userDataPath);
    const previousConfig = await loadDesktopPreviousRuntimeConfig(userDataPath);
    if (!previousConfig) {
      await clearDesktopRuntimeConfig(userDataPath);
      await resetDesktopPrismaClient();
  isDesktopReady = false;
      return {
        configured: false,
        initialized: false,
        configPath,
        message: '已取消数据库升级，请重新选择数据库文件。',
      };
    }

    await saveDesktopRuntimeConfig(userDataPath, previousConfig);
    await clearDesktopPreviousRuntimeConfig(userDataPath);
    applyDesktopRuntimeEnv(previousConfig);
    await resetDesktopPrismaClient();
    return initializeConfiguredDatabase(previousConfig, configPath, '已取消切换并恢复原数据库。');
  });

  ipcMain.handle(IPC_CHANNELS.GET_RUNTIME_CONFIG, async () => {
    ensureDesktopReady();
    return loadDesktopRuntimeConfig(app.getPath('userData'));
  });

  ipcMain.handle(IPC_CHANNELS.SAVE_RUNTIME_CONFIG, async (_event, config: DesktopRuntimeConfig) => {
    ensureDesktopReady();
    const userDataPath = app.getPath('userData');
    const currentConfig = await loadDesktopRuntimeConfig(userDataPath);
    if (currentConfig && currentConfig.databaseUrl !== config.databaseUrl) {
      throw new Error('数据库文件切换必须经过初始化与版本检查。');
    }
    await saveDesktopRuntimeConfig(userDataPath, config);
    applyDesktopRuntimeEnv(config);
    await resetDesktopPrismaClient();
    return config;
  });

  ipcMain.handle(IPC_CHANNELS.LIST_TIERS, async () => {
    ensureDesktopReady();
    return getDesktopTiers();
  });

  ipcMain.handle(IPC_CHANNELS.LIST_ACTRESSES, async (_event, query?: string) => {
    ensureDesktopReady();
    return getDesktopActresses(query);
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_ACTRESS, async (_event, input) => {
    ensureDesktopReady();
    return createDesktopActress(input);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_ACTRESS, async (_event, id: number, input) => {
    ensureDesktopReady();
    return updateDesktopActress(id, input);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_ACTRESS, async (_event, id: number) => {
    ensureDesktopReady();
    await deleteDesktopActress(id);
    return { success: true as const };
  });

  ipcMain.handle(IPC_CHANNELS.FETCH_MINNANO_PROFILE, async (_event, name: string, sourceUrl?: string) => {
    ensureDesktopReady();
    const profile = await fetchMinnanoActressProfile(name, sourceUrl);
    if (!profile.avatarUrl) {
      return profile;
    }
    try {
      const avatarPath = await downloadAvatarToUserData(app.getPath('userData'), profile.avatarUrl, profile.matchedName || name);
      return { ...profile, avatarPath };
    } catch {
      return profile;
    }
  });

  ipcMain.handle(IPC_CHANNELS.SELECT_AVATAR_FILE, async (_event, actressName: string) => {
    ensureDesktopReady();
    const result = await dialog.showOpenDialog({
      title: '选择演员头像图片',
      properties: ['openFile'],
      filters: [
        { name: 'Image files', extensions: ['jpg', 'jpeg', 'png', 'webp'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    const filePath = result.filePaths[0];
    if (result.canceled || !filePath) {
      return { canceled: true as const };
    }
    const avatarPath = await copyAvatarToUserData(app.getPath('userData'), filePath, actressName || 'actress');
    return { canceled: false as const, avatarPath };
  });

  ipcMain.handle(IPC_CHANNELS.CREATE_TIER, async (_event, input) => {
    ensureDesktopReady();
    return createDesktopTier(input);
  });

  ipcMain.handle(IPC_CHANNELS.UPDATE_TIER, async (_event, id: number, input) => {
    ensureDesktopReady();
    return updateDesktopTier(id, input);
  });

  ipcMain.handle(IPC_CHANNELS.DELETE_TIER, async (_event, id: number) => {
    ensureDesktopReady();
    await deleteDesktopTier(id);
    return { success: true as const };
  });

  ipcMain.handle(IPC_CHANNELS.GET_DASHBOARD, async () => {
    ensureDesktopReady();
    return getDesktopDashboardStats();
  });

  ipcMain.handle(IPC_CHANNELS.GET_ASSET_LOG_CHART, async () => {
    ensureDesktopReady();
    return getDesktopAssetLogChart();
  });

  ipcMain.handle(IPC_CHANNELS.START_SYNC_EMBY_IDS, async (_event, ids: number[]) => {
    ensureDesktopReady();
    return startDesktopSyncEmbyIdsTask(ids);
  });

  ipcMain.handle(IPC_CHANNELS.START_SYNC_MOVIE_COUNTS, async (_event, ids: number[]) => {
    ensureDesktopReady();
    return startDesktopSyncMovieCountsTask(ids);
  });

  ipcMain.handle(IPC_CHANNELS.START_TIER_VIDEO_SYNC, async (_event, tierId: number) => {
    ensureDesktopReady();
    return startDesktopTierVideoCountSyncTask(tierId);
  });

  ipcMain.handle(IPC_CHANNELS.START_STORAGE_IMPORT, async (_event, tierId: number, folderNames: string[]) => {
    ensureDesktopReady();
    return startDesktopStorageImportTask(tierId, folderNames);
  });

  ipcMain.handle(IPC_CHANNELS.GET_SYNC_TASK, async (_event, taskId: string) => {
    ensureDesktopReady();
    return getDesktopTaskState(taskId);
  });

  ipcMain.handle(IPC_CHANNELS.CANCEL_SYNC_TASK, async (_event, taskId: string) => {
    ensureDesktopReady();
    requestCancelDesktopTask(taskId);
    return { ok: true as const };
  });

  ipcMain.handle(IPC_CHANNELS.SCAN_STORAGE, async (_event, tierId: number, rawPath: string) => {
    ensureDesktopReady();
    return scanDesktopTierStorage(tierId, rawPath);
  });

  ipcMain.handle(IPC_CHANNELS.BATCH_IMPORT_STORAGE_FOLDERS, async (_event, tierId: number, folderNames: string[]) => {
    ensureDesktopReady();
    return importDesktopTierFoldersAsActresses(tierId, folderNames);
  });

  ipcMain.handle(IPC_CHANNELS.SELECT_DATABASE_FILE, async () => {
    const result = await dialog.showOpenDialog({
      title: '选择 JATLAS 数据库文件',
      properties: ['openFile'],
      filters: [
        { name: 'SQLite database', extensions: ['db', 'sqlite', 'sqlite3'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    const filePath = result.filePaths[0];
    if (result.canceled || !filePath) {
      return { canceled: true as const };
    }
    return {
      canceled: false as const,
      filePath,
      databaseUrl: databaseUrlFromFilePath(filePath),
    };
  });

  ipcMain.handle(IPC_CHANNELS.SELECT_STORAGE_FOLDER, async () => {
    ensureDesktopReady();
    const result = await dialog.showOpenDialog({
      title: '选择 NAS 或本机存储目录',
      properties: ['openDirectory', 'createDirectory'],
    });
    const folderPath = result.filePaths[0];
    if (result.canceled || !folderPath) {
      return { canceled: true as const };
    }
    return { canceled: false as const, folderPath };
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_USER_DATA_FOLDER, async () => {
    ensureDesktopReady();
    const dir = app.getPath('userData');
    await shell.openPath(dir);
    return { ok: true as const };
  });
}

function setupMainProcessDiagnostics() {
  const logPath = path.join(app.getPath('userData'), 'jatlas-main.log');
  const append = (line: string) => {
    try {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${line}\n`);
    } catch {
      /* ignore */
    }
  };
  process.on('uncaughtException', (err) => {
    append(`uncaughtException: ${err.stack ?? err.message}`);
  });
  process.on('unhandledRejection', (reason) => {
    append(`unhandledRejection: ${String(reason)}`);
  });
}

app.whenReady().then(() => {
  setupMainProcessDiagnostics();
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
