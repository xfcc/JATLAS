import { buildAssetCategoryCards, workspaceTabs } from '../../apps/desktop/renderer/src/workspaceNavigation';

describe('workspace navigation', () => {
  it('uses asset-centered top-level tabs', () => {
    expect(workspaceTabs).toEqual([
      { key: 'intro', label: '介绍' },
      { key: 'assets', label: '资产' },
      { key: 'config', label: '配置' },
    ]);
  });

  it('builds category cards with healthy capacity usage and overloaded videos', () => {
    const cards = buildAssetCategoryCards({
      tiers: [
        { id: 1, name: 'S', video_limit: 80, total_video_limit: 180, status: 'active', actressCount: 2 },
        { id: 2, name: 'A', video_limit: null, total_video_limit: 120, status: 'retired', actressCount: 1 },
      ],
      distribution: [
        { id: 1, name: 'S', count: 2, total_video_count: 120, percentage: 66.7 },
        { id: 2, name: 'A', count: 1, total_video_count: 22, percentage: 33.3 },
      ],
    });

    expect(cards).toEqual([
      {
        id: 1,
        name: 'S',
        actressCount: 2,
        totalVideoCount: 120,
        overloadedVideoCount: 0,
        healthyCapacity: 180,
        usageText: '66.7%',
      },
      {
        id: 2,
        name: 'A',
        actressCount: 1,
        totalVideoCount: 22,
        overloadedVideoCount: 0,
        healthyCapacity: 120,
        usageText: '18.3%',
      },
    ]);
  });

  it('counts overloaded videos above healthy capacity', () => {
    const [card] = buildAssetCategoryCards({
      tiers: [{ id: 1, name: 'S', video_limit: 50, total_video_limit: 100, status: 'active', actressCount: 2 }],
      distribution: [{ id: 1, name: 'S', count: 2, total_video_count: 130, percentage: 100 }],
    });

    expect(card.overloadedVideoCount).toBe(30);
    expect(card.healthyCapacity).toBe(100);
    expect(card.usageText).toBe('130.0%');
  });

  it('falls back to actress count and per-actress limit when total limit is missing', () => {
    const [card] = buildAssetCategoryCards({
      tiers: [{ id: 1, name: 'A', video_limit: null, total_video_limit: null, status: 'active', actressCount: 3 }],
      distribution: [{ id: 1, name: 'A', count: 3, total_video_count: 150, percentage: 100 }],
    });

    expect(card.healthyCapacity).toBe(300);
    expect(card.usageText).toBe('50.0%');
  });
});
