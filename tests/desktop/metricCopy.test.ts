import { assetMetricCopy } from '../../apps/desktop/renderer/src/metricCopy';

describe('asset metric copy', () => {
  it('keeps single-actress limits separate from category capacity', () => {
    expect(assetMetricCopy.actressOverLimitVideos.label).toBe('单人超限影片');
    expect(assetMetricCopy.actressOverLimitVideos.description).toContain('单人影片上限');
    expect(assetMetricCopy.tierCapacityOverflow.label).toBe('容量超出');
    expect(assetMetricCopy.tierCapacityOverflow.description).toContain('分类影片上限');
  });

  it('states the time windows used by update metrics', () => {
    expect(assetMetricCopy.activeNotUpdatedThirtyDays.label).toBe('30 天未扩增');
    expect(assetMetricCopy.activeNotUpdatedThirtyDays.description).toContain('没有增加');
    expect(assetMetricCopy.profileNotUpdatedSixMonths.description).toContain('6 个月');
  });
});
