import type { DesktopActress, DesktopDashboardStats, DesktopTier } from '../../core/desktopDataService';
import type { DesktopRuntimeConfig } from '../../core/configService';

const tiers: DesktopTier[] = [
  { id: 1, name: '核心收藏', video_limit: 80, total_video_limit: 240, status: 'active', actressCount: 3 },
  { id: 2, name: '常规收藏', video_limit: 40, total_video_limit: 120, status: 'active', actressCount: 2 },
  { id: 3, name: '待整理', video_limit: 20, total_video_limit: 40, status: 'active', actressCount: 1 },
];

const baseActress = {
  status: 'active', embyIds: ['12345'], roman: '', aliases: [], birthday: '1995-04-12', cup: 'D', bust: '86', waist: '58', hip: '87',
  career_from: '2018', career_to: '', minnano_url: '', avatar_path: '', tags: [], updated_at: '2026-08-01T10:00:00.000Z',
};

const actresses: DesktopActress[] = [
  { ...baseActress, id: 1, name: '青山夏子', tierId: 1, tierName: '核心收藏', video_count: 92 },
  { ...baseActress, id: 2, name: '林田美月', tierId: 1, tierName: '核心收藏', video_count: 64, updated_at: '2026-06-18T10:00:00.000Z' },
  { ...baseActress, id: 3, name: '白石千寻', tierId: 1, tierName: '核心收藏', video_count: 37 },
  { ...baseActress, id: 4, name: '川島遗音', tierId: 2, tierName: '常规收藏', video_count: 45, embyIds: [] },
  { ...baseActress, id: 5, name: '高桥未来', tierId: 2, tierName: '常规收藏', video_count: 28 },
  { ...baseActress, id: 6, name: '松田海', tierId: 3, tierName: '待整理', video_count: 31, status: 'retired' },
];

const dashboard: DesktopDashboardStats = {
  m1: { totalCount: 6, activeCount: 5, retiredCount: 1, totalAssets: 297, overloadedAssets: 28 },
  m2: { pendingEmbyLink: 1, pendingManagement: 3, pendingUpdate: 1 },
  m3: [
    { id: 1, name: '核心收藏', count: 3, total_video_count: 193, percentage: 50 },
    { id: 2, name: '常规收藏', count: 2, total_video_count: 73, percentage: 33.3 },
    { id: 3, name: '待整理', count: 1, total_video_count: 31, percentage: 16.7 },
  ],
};

const mockTheme = new URLSearchParams(window.location.search).get('theme') === 'light' ? 'light' : 'dark';
let runtimeConfig: DesktopRuntimeConfig = { dbMode: 'sqlite', databaseUrl: 'file:/tmp/jatlas-visual-audit.db', themeMode: mockTheme, embyServerUrl: 'http://emby.local:8096', tierStoragePaths: { '1': '/Volumes/Media/Core', '2': '/Volumes/Media/Regular' } };

window.desktopApi = {
  getHealthSnapshot: async () => ({ appName: 'JATLAS Desktop', runtime: 'electron-main', nodeVersion: 'mock', platform: 'darwin', arch: 'arm64', timestamp: new Date().toISOString() }),
  getBootstrapState: async () => ({ configured: true, initialized: true, configPath: '/tmp/desktop-config.json', message: '开发预览数据已就绪。' }),
  getDefaultDatabaseFile: async () => ({ filePath: '/tmp/jatlas-visual-audit.db', databaseUrl: runtimeConfig.databaseUrl }),
  saveConfigAndInit: async (config) => ({ configured: true, initialized: true, configPath: '/tmp/desktop-config.json', message: `已切换至 ${config.databaseUrl}` }),
  confirmDatabaseMigration: async () => ({ configured: true, initialized: true, configPath: '/tmp/desktop-config.json', message: '数据库已是当前版本。' }),
  cancelDatabaseMigration: async () => ({ configured: true, initialized: true, configPath: '/tmp/desktop-config.json', message: '已恢复原数据库。' }),
  getRuntimeConfig: async () => runtimeConfig,
  saveRuntimeConfig: async (config) => { runtimeConfig = { ...runtimeConfig, ...config }; return runtimeConfig; },
  listTiers: async () => tiers,
  listActresses: async (query) => query ? actresses.filter((row) => row.name.includes(query)) : actresses,
  createActress: async () => actresses[0], updateActress: async () => actresses[0], deleteActress: async () => ({ success: true }),
  fetchMinnanoProfile: async (name) => ({ matchedName: name, avatarUrl: '', roman: '', aliases: [], birthday: '', cup: '', bust: '', waist: '', hip: '', career_from: '', career_to: '', tags: [], sourceUrl: '' }),
  selectAvatarFile: async () => ({ canceled: true }),
  createTier: async () => tiers[0], updateTier: async () => tiers[0], deleteTier: async () => ({ success: true }),
  getDashboard: async () => dashboard,
  getAssetLogChart: async () => [
    { name: '2026-03', '收录扩张': 8, '资产入库': 10, '资产出库': 2 },
    { name: '2026-04', '收录扩张': -3, '资产入库': 2, '资产出库': 5 },
    { name: '2026-05', '收录扩张': 12, '资产入库': 12, '资产出库': 0 },
    { name: '2026-06', '收录扩张': 4, '资产入库': 7, '资产出库': 3 },
    { name: '2026-07', '收录扩张': -1, '资产入库': 3, '资产出库': 4 },
    { name: '2026-08', '收录扩张': 6, '资产入库': 6, '资产出库': 0 },
  ],
  startSyncEmbyIds: async () => ({ taskId: 'mock-task' }), startSyncMovieCounts: async () => ({ taskId: 'mock-task' }), startTierVideoSync: async () => ({ taskId: 'mock-task' }), startStorageImport: async () => ({ taskId: 'mock-task' }),
  getSyncTask: async () => null, cancelSyncTask: async () => ({ ok: true }),
  scanStorage: async () => ({ resolvedPath: '/Volumes/Media/Core', folders: ['青山夏子', '林田美月'] }),
  batchImportStorageFolders: async () => ({ created: [], skippedExisting: [], skippedEmpty: 0 }),
  selectDatabaseFile: async () => ({ canceled: true }), selectStorageFolder: async () => ({ canceled: true }), openUserDataFolder: async () => ({ ok: true }),
};
