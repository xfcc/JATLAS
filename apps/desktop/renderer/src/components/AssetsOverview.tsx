import type { DesktopAssetLogChartRow, DesktopDashboardStats } from '../../../core/desktopDataService';
import { assetMetricCopy } from '../metricCopy';
import { terminalProgressBar } from '../terminalDesign';
import type { AssetCategoryCard } from '../workspaceNavigation';

type AssetsOverviewProps = {
  stats: DesktopDashboardStats;
  chart: DesktopAssetLogChartRow[];
  categories: AssetCategoryCard[];
  onOpenCategory: (tierId: number) => void;
};

function MetricCard({ label, value, description }: { label: string; value: string | number; description?: string }) {
  return (
    <div className="asset-metric-card">
      <div className="asset-metric-label" title={description}>{label}</div>
      <div className="asset-metric-value">{value}</div>
    </div>
  );
}

export function AssetsOverview({ stats, chart, categories, onOpenCategory }: AssetsOverviewProps) {
  return (
    <div className="assets-overview">
      <h2>当前资产状态</h2>
      <div className="asset-metric-grid">
        <MetricCard label="演员总数" value={stats.m1.totalCount} />
        <MetricCard label="现役 / 引退" value={`${stats.m1.activeCount} / ${stats.m1.retiredCount}`} />
        <MetricCard label="影片总量" value={stats.m1.totalAssets} />
        <MetricCard label={assetMetricCopy.actressOverLimitVideos.label} value={stats.m1.overloadedAssets} description={assetMetricCopy.actressOverLimitVideos.description} />
        <MetricCard label="待绑定 Emby" value={stats.m2.pendingEmbyLink} />
        <MetricCard label={assetMetricCopy.actressesOverLimit.label} value={stats.m2.pendingManagement} description={assetMetricCopy.actressesOverLimit.description} />
        <MetricCard label={assetMetricCopy.activeNotUpdatedThirtyDays.label} value={stats.m2.pendingUpdate} description={assetMetricCopy.activeNotUpdatedThirtyDays.description} />
      </div>

      <h2>分类</h2>
      {categories.length > 0 ? (
        <div className="asset-category-grid">
          {categories.map((card) => (
            <button type="button" className="asset-category-card" key={card.id} onClick={() => onOpenCategory(card.id)}>
              <span className="asset-category-card-top"><strong>{card.name}</strong></span>
              <span className="asset-category-card-stats">
                <span><small>演员</small><b>{card.actressCount}</b></span>
                <span><small>影片</small><b>{card.totalVideoCount}</b></span>
                <span><small title={assetMetricCopy.tierCapacityOverflow.description}>{assetMetricCopy.tierCapacityOverflow.label}</small><b>{card.overloadedVideoCount}</b></span>
              </span>
              <span className="asset-category-progress">{terminalProgressBar(card.totalVideoCount, card.healthyCapacity, 18)} {card.usageText}</span>
            </button>
          ))}
        </div>
      ) : (
        <section className="empty-state"><p>还没有分类。请先到“配置”中新建分类，并设置存储目录。</p></section>
      )}

      <h3>资产日志（近 6 个月）</h3>
      <section className="asset-log-table-wrap">
        <table className="asset-log-table">
          <thead><tr><th>月份</th><th>收录扩张</th><th>资产入库</th><th>资产出库</th></tr></thead>
          <tbody>{chart.map((row) => <tr key={row.name}><td>{row.name}</td><td>{row['收录扩张']}</td><td>{row['资产入库']}</td><td>{row['资产出库']}</td></tr>)}</tbody>
        </table>
      </section>
    </div>
  );
}
