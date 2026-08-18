import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssetsOverview } from '../../apps/desktop/renderer/src/components/AssetsOverview';
import { ActivityLogPane } from '../../apps/desktop/renderer/src/components/ActivityLogPane';
import { ActressNameCell } from '../../apps/desktop/renderer/src/components/ActressNameCell';
import { IntroPage } from '../../apps/desktop/renderer/src/components/IntroPage';
import { SettingsPage } from '../../apps/desktop/renderer/src/components/SettingsPage';

describe('renderer components', () => {
  it('renders the product boundary and natural Chinese navigation content', () => {
    const html = renderToStaticMarkup(React.createElement(IntroPage));
    expect(html).toContain('不提供账号体系');
    expect(html).toContain('把影片资产重新纳入');
  });

  it('renders metric definitions and category capacity separately', () => {
    const html = renderToStaticMarkup(React.createElement(AssetsOverview, {
      stats: {
        m1: { totalCount: 2, activeCount: 2, retiredCount: 0, totalAssets: 130, overloadedAssets: 30 },
        m2: { pendingEmbyLink: 1, pendingManagement: 1, pendingUpdate: 0 },
        m3: [],
      },
      chart: [],
      categories: [{ id: 1, name: '核心收藏', actressCount: 2, totalVideoCount: 130, overloadedVideoCount: 30, healthyCapacity: 100, usageText: '130.0%' }],
      onOpenCategory: () => undefined,
    }));

    expect(html).toContain('单人超限影片');
    expect(html).toContain('容量超出');
    expect(html).toContain('130.0%');
  });

  it('gives repeated category actions distinct accessible names', () => {
    const html = renderToStaticMarkup(React.createElement(SettingsPage, {
      databasePath: '/tmp/jatlas.db', themeMode: 'dark', embyServerUrl: '', embyApiKey: '', saving: false,
      submitting: false, tiers: [{ id: 1, name: '核心收藏', video_limit: 80, total_video_limit: 200, status: 'active', actressCount: 2 }],
      tierStoragePaths: {}, onSelectDatabase: () => undefined, onThemeChange: () => undefined,
      onEmbyServerUrlChange: () => undefined, onEmbyApiKeyChange: () => undefined, onSave: () => undefined,
      onCreateTier: () => undefined, onEditTier: () => undefined, onDeleteTier: () => undefined,
    }));

    expect(html).toContain('aria-label="编辑分类 核心收藏"');
    expect(html).toContain('aria-label="删除分类 核心收藏"');
  });

  it('keeps task controls inside the right activity log pane', () => {
    const html = renderToStaticMarkup(React.createElement(ActivityLogPane, {
      open: true,
      running: true,
      failed: true,
      hasActivities: false,
      lines: [],
      bodyRef: { current: null },
      lastLineRef: { current: null },
      onCancel: () => undefined,
      retryFailureCount: 2,
      onRetry: () => undefined,
      onClose: () => undefined,
    }));

    expect(html).toContain('aria-label="操作日志"');
    expect(html).toContain('取消任务');
    expect(html).toContain('重试失败项 (2)');
  });

  it('marks retired actresses beside the name without adding status to active names', () => {
    const retiredHtml = renderToStaticMarkup(React.createElement(ActressNameCell, {
      name: '松田海',
      retired: true,
      missingEmbyId: false,
    }));
    const activeHtml = renderToStaticMarkup(React.createElement(ActressNameCell, {
      name: '青山夏子',
      retired: false,
      missingEmbyId: false,
    }));

    expect(retiredHtml).toContain('class="actress-name-cell is-retired"');
    expect(retiredHtml).toContain('aria-label="已引退"');
    expect(retiredHtml).toContain('[引退]');
    expect(activeHtml).not.toContain('[引退]');
  });
});
