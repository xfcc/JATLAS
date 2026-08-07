import type { DesktopDashboardStats, DesktopTier } from '../../core/desktopDataService';

export type WorkspaceTab = 'intro' | 'assets' | 'config';

export const workspaceTabs: Array<{ key: WorkspaceTab; label: string }> = [
  { key: 'intro', label: '介绍' },
  { key: 'assets', label: '资产' },
  { key: 'config', label: '配置' },
];

export type AssetCategoryCard = {
  id: number;
  name: string;
  actressCount: number;
  totalVideoCount: number;
  overloadedVideoCount: number;
  healthyCapacity: number;
  usageText: string;
};

type BuildAssetCategoryCardsInput = {
  tiers: DesktopTier[];
  distribution: DesktopDashboardStats['m3'];
};

export function buildAssetCategoryCards({
  tiers,
  distribution,
}: BuildAssetCategoryCardsInput): AssetCategoryCard[] {
  const distributionById = new Map(distribution.map((row) => [row.id, row]));

  return tiers.map((tier) => {
    const row = distributionById.get(tier.id);
    const actressCount = row?.count ?? tier.actressCount;
    const totalVideoCount = row?.total_video_count ?? 0;
    const videoLimit = tier.video_limit ?? 100;
    const healthyCapacity = tier.total_video_limit ?? actressCount * videoLimit;
    const overloadedVideoCount = Math.max(totalVideoCount - healthyCapacity, 0);
    const usage = healthyCapacity > 0 ? (totalVideoCount / healthyCapacity) * 100 : 0;

    return {
      id: tier.id,
      name: tier.name,
      actressCount,
      totalVideoCount,
      overloadedVideoCount,
      healthyCapacity,
      usageText: `${usage.toFixed(1)}%`,
    };
  });
}
