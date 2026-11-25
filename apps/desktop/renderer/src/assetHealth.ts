import type { DesktopActress } from '../../core/desktopDataService';
import { getActressAge, getActressCareerDuration } from './actressProfileMetrics';

export type AssetHealthStatus = 'healthy' | 'warning' | 'overloaded';
export type ActressSortKey = 'video_count' | 'cup' | 'age' | 'career_duration' | 'asset_expanded_at';
export type SortDirection = 'asc' | 'desc';

export function getAssetHealthStatus(videoCount: number, videoLimit: number | null): AssetHealthStatus {
  if (videoLimit === null) return 'healthy';
  if (videoLimit <= 0) return videoCount > 0 ? 'overloaded' : 'healthy';
  const usageRatio = videoCount / videoLimit;
  if (usageRatio > 1.2) return 'overloaded';
  if (usageRatio > 1) return 'warning';
  return 'healthy';
}

export function assetHealthLabel(status: AssetHealthStatus) {
  if (status === 'overloaded') return '超限';
  if (status === 'warning') return '预警';
  return '健康';
}

function sortableTime(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortableCup(value: string) {
  const cup = value.trim().toUpperCase();
  if (!cup) return Number.POSITIVE_INFINITY;
  const match = /^[A-Z]+/.exec(cup);
  if (!match) return Number.POSITIVE_INFINITY;
  return match[0].split('').reduce((rank, char) => rank * 26 + (char.charCodeAt(0) - 64), 0);
}

function sortableAge(row: DesktopActress) {
  return getActressAge(row.birthday, row.career_to) ?? Number.POSITIVE_INFINITY;
}

function sortableCareerDuration(row: DesktopActress) {
  return getActressCareerDuration(row.career_from, row.career_to) ?? Number.POSITIVE_INFINITY;
}

export function sortActresses(
  rows: DesktopActress[],
  sortKey: ActressSortKey,
  direction: SortDirection,
): DesktopActress[] {
  const multiplier = direction === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    let result: number;
    if (sortKey === 'video_count') {
      result = a.video_count - b.video_count;
    } else if (sortKey === 'cup') {
      const aCup = sortableCup(a.cup);
      const bCup = sortableCup(b.cup);
      if (!Number.isFinite(aCup) && !Number.isFinite(bCup)) {
        result = 0;
      } else if (!Number.isFinite(aCup)) {
        return 1;
      } else if (!Number.isFinite(bCup)) {
        return -1;
      } else {
        result = aCup - bCup;
      }
    } else if (sortKey === 'age') {
      const aAge = sortableAge(a);
      const bAge = sortableAge(b);
      if (!Number.isFinite(aAge) && !Number.isFinite(bAge)) {
        result = 0;
      } else if (!Number.isFinite(aAge)) {
        return 1;
      } else if (!Number.isFinite(bAge)) {
        return -1;
      } else {
        result = aAge - bAge;
      }
    } else if (sortKey === 'career_duration') {
      const aCareer = sortableCareerDuration(a);
      const bCareer = sortableCareerDuration(b);
      if (!Number.isFinite(aCareer) && !Number.isFinite(bCareer)) {
        result = 0;
      } else if (!Number.isFinite(aCareer)) {
        return 1;
      } else if (!Number.isFinite(bCareer)) {
        return -1;
      } else {
        result = aCareer - bCareer;
      }
    } else {
      result = sortableTime(a.asset_expanded_at) - sortableTime(b.asset_expanded_at);
    }
    return result === 0 ? a.name.localeCompare(b.name, 'zh-CN') : result * multiplier;
  });
}
