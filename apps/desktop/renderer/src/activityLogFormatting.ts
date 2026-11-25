import type { DesktopRuntimeConfig } from '../../core/configService';
import type { DesktopActress, DesktopTier } from '../../core/desktopDataService';
import type { TaskActivityEvent, TaskSummary } from '../../core/desktopTaskStore';

export type RuntimeSettingChange = {
  label: string;
  detail: string;
};

export type ActressLogEntry = {
  label: string;
  detail: string;
};

export type TierLogEntry = {
  label: string;
  detail: string;
};

export type StorageScanLogEntry = {
  label: string;
  detail: string;
};

export function formatStorageScanSummaryText(folderCount: number) {
  if (folderCount === 0) return '没有找到一级子文件夹，或该路径不是目录。';
  return `扫描到 ${folderCount} 个一级文件夹。`;
}

export function getStorageScanLogEntries(folders: string[], resolvedPath: string): StorageScanLogEntry[] {
  const entries: StorageScanLogEntry[] = [{ label: '实际路径', detail: resolvedPath }];
  if (folders.length === 0) {
    entries.push({ label: '扫描结果', detail: formatStorageScanSummaryText(0) });
    return entries;
  }
  return entries.concat(folders.map((folder) => ({ label: folder, detail: '一级子文件夹' })));
}

export function formatStorageImportSummaryText(summary: TaskSummary, fallbackTotal: number) {
  const scanned = summary.scannedFolders ?? summary.total ?? fallbackTotal;
  const validNames = summary.validNames ?? scanned;
  const existingCurrent = summary.existingCurrent ?? 0;
  const created = summary.created ?? 0;
  const existingOther = summary.existingOther ?? 0;
  const error = summary.error ?? 0;
  const errorText = error > 0 ? `，写入失败 ${error} 人` : '';

  return `扫描 ${scanned} 个文件夹，识别 ${validNames} 个有效演员名。当前分级已存在 ${existingCurrent} 人，新增 ${created} 人，存在于其他分级 ${existingOther} 人${errorText}。`;
}

export function formatVideoCountSyncSummaryText(summary: TaskSummary, fallbackTotal: number) {
  const total = summary.total ?? fallbackTotal;
  const changed = summary.changedCount ?? 0;
  const unchanged = summary.unchangedCount ?? 0;
  const skipped = summary.skipped ?? 0;
  const error = summary.error ?? 0;
  const netDelta = summary.netDelta ?? 0;

  return `检查 ${total} 位演员，更新 ${changed} 人，无变化 ${unchanged} 人，未绑定 Emby ID ${skipped} 人，失败 ${error} 人。影片数量净增 ${netDelta} 部。`;
}

export function formatEmbyIdSyncSummaryText(summary: TaskSummary, fallbackTotal: number) {
  const total = summary.total ?? fallbackTotal;
  const existingEmbyId = summary.existingEmbyId ?? 0;
  const bound = summary.bound ?? 0;
  const notFound = summary.notFound ?? 0;
  const error = summary.error ?? 0;

  return `检查 ${total} 位演员，已有 Emby ID ${existingEmbyId} 人，新增绑定 ${bound} 人，Emby 未找到 ${notFound} 人，失败 ${error} 人。`;
}

export function getVideoCountSyncEventGroups(events: TaskActivityEvent[]) {
  return {
    increased: events.filter(
      (event) => event.result === 'success' && typeof event.delta === 'number' && event.delta > 0,
    ),
    decreased: events.filter(
      (event) => event.result === 'success' && typeof event.delta === 'number' && event.delta < 0,
    ),
    failed: events.filter((event) => event.result === 'error'),
  };
}

export function getEmbyIdSyncEventGroups(events: TaskActivityEvent[]) {
  return {
    bound: events.filter((event) => event.action === '新增绑定'),
    notFound: events.filter((event) => event.action === 'Emby 未找到'),
    failed: events.filter((event) => event.result === 'error'),
  };
}

function normalizeOptionalValue(value: string | undefined) {
  return value?.trim() ?? '';
}

function normalizeTierStoragePaths(paths: Record<string, string> | undefined) {
  const entries = Object.entries(paths ?? {})
    .map(([key, value]) => [key, value.trim()] as const)
    .filter(([, value]) => value.length > 0)
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify(entries);
}

export function getRuntimeSettingsChanges(
  before: DesktopRuntimeConfig | null | undefined,
  after: DesktopRuntimeConfig,
): RuntimeSettingChange[] {
  const previous = before ?? { dbMode: after.dbMode, databaseUrl: '' };
  const fields = [
    {
      label: '数据库文件',
      before: normalizeOptionalValue(previous.databaseUrl),
      after: normalizeOptionalValue(after.databaseUrl),
    },
    {
      label: 'Emby 服务地址',
      before: normalizeOptionalValue(previous.embyServerUrl),
      after: normalizeOptionalValue(after.embyServerUrl),
    },
    {
      label: 'Emby API Key',
      before: normalizeOptionalValue(previous.embyApiKey),
      after: normalizeOptionalValue(after.embyApiKey),
    },
    {
      label: '默认存储根目录',
      before: normalizeOptionalValue(previous.storageRootPath),
      after: normalizeOptionalValue(after.storageRootPath),
    },
    {
      label: '视觉模式',
      before: normalizeOptionalValue(previous.themeMode),
      after: normalizeOptionalValue(after.themeMode),
    },
    {
      label: '分级存储地址',
      before: normalizeTierStoragePaths(previous.tierStoragePaths),
      after: normalizeTierStoragePaths(after.tierStoragePaths),
    },
  ];

  return fields
    .filter((field) => field.before !== field.after)
    .map((field) => ({
      label: field.label,
      detail: '已更新',
    }));
}

export function formatRuntimeSettingsSummaryText(changeCount: number) {
  if (changeCount === 0) return '运行配置已保存，无配置项变化。';
  return `运行配置已保存，更新 ${changeCount} 项。`;
}

function formatEmbyIdCount(ids: string[]) {
  return `${ids.length} 个`;
}

function formatStringListValue(values: string[]) {
  return values.length > 0 ? values.join(', ') : '未设置';
}

function formatTextValue(value: string) {
  return value.trim() || '未设置';
}

function normalizeEmbyIds(ids: string[]) {
  return [...ids].map((id) => id.trim()).filter(Boolean).sort();
}

function sameStringList(left: string[], right: string[]) {
  const normalizedLeft = normalizeEmbyIds(left);
  const normalizedRight = normalizeEmbyIds(right);
  return (
    normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((value, index) => value === normalizedRight[index])
  );
}

function formatActressStatus(status: string) {
  return status === 'retired' ? '引退' : '现役';
}

export function getActressUpdateChanges(before: DesktopActress, after: DesktopActress): ActressLogEntry[] {
  const changes: ActressLogEntry[] = [];

  if (before.name !== after.name) {
    changes.push({ label: '名称', detail: `${before.name} -> ${after.name}` });
  }
  if (before.tierId !== after.tierId || before.tierName !== after.tierName) {
    changes.push({ label: '分级', detail: `${before.tierName} -> ${after.tierName}` });
  }
  if (before.status !== after.status) {
    changes.push({ label: '演员状态', detail: `${formatActressStatus(before.status)} -> ${formatActressStatus(after.status)}` });
  }
  if (before.video_count !== after.video_count) {
    const delta = after.video_count - before.video_count;
    changes.push({
      label: '影片数量',
      detail: `${before.video_count} -> ${after.video_count}  ${delta > 0 ? `+${delta}` : String(delta)}`,
    });
  }
  if (!sameStringList(before.embyIds, after.embyIds)) {
    const beforeCount = formatEmbyIdCount(before.embyIds);
    const afterCount = formatEmbyIdCount(after.embyIds);
    changes.push({
      label: 'Emby ID',
      detail:
        before.embyIds.length === after.embyIds.length
          ? `${beforeCount} -> ${afterCount}（内容已更新）`
          : `${beforeCount} -> ${afterCount}`,
    });
  }
  if (before.roman !== after.roman) {
    changes.push({ label: '英文名', detail: `${formatTextValue(before.roman)} -> ${formatTextValue(after.roman)}` });
  }
  if (!sameStringList(before.aliases, after.aliases)) {
    changes.push({ label: '别名 / aliases', detail: `${formatStringListValue(before.aliases)} -> ${formatStringListValue(after.aliases)}` });
  }
  if (before.birthday !== after.birthday) {
    changes.push({ label: '出生日期', detail: `${formatTextValue(before.birthday)} -> ${formatTextValue(after.birthday)}` });
  }
  if (before.cup !== after.cup) {
    changes.push({ label: '罩杯', detail: `${formatTextValue(before.cup)} -> ${formatTextValue(after.cup)}` });
  }
  if (before.bust !== after.bust) {
    changes.push({ label: '胸围 / bust', detail: `${formatTextValue(before.bust)} -> ${formatTextValue(after.bust)}` });
  }
  if (before.waist !== after.waist) {
    changes.push({ label: '腰围 / waist', detail: `${formatTextValue(before.waist)} -> ${formatTextValue(after.waist)}` });
  }
  if (before.hip !== after.hip) {
    changes.push({ label: '臀围 / hip', detail: `${formatTextValue(before.hip)} -> ${formatTextValue(after.hip)}` });
  }
  if (before.career_from !== after.career_from) {
    changes.push({ label: '出演开始', detail: `${formatTextValue(before.career_from)} -> ${formatTextValue(after.career_from)}` });
  }
  if (before.career_to !== after.career_to) {
    changes.push({ label: '出演结束', detail: `${formatTextValue(before.career_to)} -> ${formatTextValue(after.career_to)}` });
  }
  if (before.minnano_url !== after.minnano_url) {
    changes.push({ label: 'Minnano 来源地址', detail: `${formatTextValue(before.minnano_url)} -> ${formatTextValue(after.minnano_url)}` });
  }
  if (!sameStringList(before.tags, after.tags)) {
    changes.push({ label: '标签', detail: `${formatStringListValue(before.tags)} -> ${formatStringListValue(after.tags)}` });
  }

  return changes;
}

export function getActressCreatedSnapshot(row: DesktopActress): ActressLogEntry[] {
  return [
    { label: '演员 ID', detail: `#${row.id}` },
    { label: '分级', detail: row.tierName },
    { label: '演员状态', detail: formatActressStatus(row.status) },
    { label: '影片数量', detail: String(row.video_count) },
    { label: 'Emby ID', detail: formatEmbyIdCount(row.embyIds) },
    { label: '英文名', detail: formatTextValue(row.roman) },
    { label: '别名 / aliases', detail: formatStringListValue(row.aliases) },
    { label: '出生日期', detail: formatTextValue(row.birthday) },
    { label: '罩杯', detail: formatTextValue(row.cup) },
    { label: '胸围 / bust', detail: formatTextValue(row.bust) },
    { label: '腰围 / waist', detail: formatTextValue(row.waist) },
    { label: '臀围 / hip', detail: formatTextValue(row.hip) },
    { label: '出演开始', detail: formatTextValue(row.career_from) },
    { label: '出演结束', detail: formatTextValue(row.career_to) },
    { label: 'Minnano 来源地址', detail: formatTextValue(row.minnano_url) },
    { label: '标签', detail: formatStringListValue(row.tags) },
  ];
}

export function getActressDeletedSnapshot(row: DesktopActress): ActressLogEntry[] {
  return getActressCreatedSnapshot(row);
}

export function formatActressUpdatedSummaryText(changeCount: number) {
  if (changeCount === 0) return '演员信息已保存，无信息变化。';
  return `演员信息已更新，变更 ${changeCount} 项。`;
}

export function formatActressCreatedSummaryText(tierName: string) {
  return `演员已创建，归入 ${tierName} 分级。`;
}

export function formatActressDeletedSummaryText() {
  return '演员已删除。';
}

function formatTierLimit(limit: number | null) {
  return limit === null ? '不限' : String(limit);
}

function formatTierTotalLimit(limit: number | null) {
  return limit === null ? '未设置' : String(limit);
}

function formatTierStatus(status: string) {
  return status === 'retired' ? '引退' : '现役';
}

export function getTierUpdateChanges(before: DesktopTier, after: DesktopTier): TierLogEntry[] {
  const changes: TierLogEntry[] = [];

  if (before.name !== after.name) {
    changes.push({ label: '名称', detail: `${before.name} -> ${after.name}` });
  }
  if (before.video_limit !== after.video_limit) {
    changes.push({
      label: '影片上限',
      detail: `${formatTierLimit(before.video_limit)} -> ${formatTierLimit(after.video_limit)}`,
    });
  }
  if (before.total_video_limit !== after.total_video_limit) {
    changes.push({
      label: '分类总数量',
      detail: `${formatTierTotalLimit(before.total_video_limit)} -> ${formatTierTotalLimit(after.total_video_limit)}`,
    });
  }
  if (before.status !== after.status) {
    changes.push({ label: '状态', detail: `${formatTierStatus(before.status)} -> ${formatTierStatus(after.status)}` });
  }

  return changes;
}

export function getTierCreatedSnapshot(tier: DesktopTier): TierLogEntry[] {
  return [
    { label: '分级 ID', detail: `#${tier.id}` },
    { label: '影片上限', detail: formatTierLimit(tier.video_limit) },
    { label: '分类总数量', detail: formatTierTotalLimit(tier.total_video_limit) },
    { label: '状态', detail: formatTierStatus(tier.status) },
    { label: '演员数', detail: String(tier.actressCount) },
  ];
}

export function getTierDeletedSnapshot(tier: DesktopTier): TierLogEntry[] {
  return getTierCreatedSnapshot(tier);
}

export function formatTierUpdatedSummaryText(changeCount: number) {
  if (changeCount === 0) return '分级信息已保存，无信息变化。';
  return `分级信息已更新，变更 ${changeCount} 项。`;
}

export function formatTierCreatedSummaryText() {
  return '分级已创建。';
}

export function formatTierDeletedSummaryText() {
  return '分级已删除。';
}
