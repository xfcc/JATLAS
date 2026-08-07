import {
  assetHealthLabel,
  getAssetHealthStatus,
  sortActresses,
} from '../../apps/desktop/renderer/src/assetHealth';
import type { DesktopActress } from '../../apps/desktop/core/desktopDataService';

function actress(input: Partial<DesktopActress> & Pick<DesktopActress, 'name'>): DesktopActress {
  return {
    id: 1,
    name: input.name,
    tierId: 1,
    tierName: 'S',
    video_count: input.video_count ?? 0,
    status: input.status ?? 'active',
    embyIds: [],
    roman: '',
    aliases: [],
    cup: input.cup ?? '',
    bust: '',
    waist: '',
    hip: '',
    birthday: input.birthday ?? '',
    career_from: input.career_from ?? '',
    career_to: input.career_to ?? '',
    minnano_url: '',
    avatar_path: '',
    tags: [],
    asset_expanded_at: input.asset_expanded_at ?? '2026-06-01T00:00:00.000Z',
  };
}

describe('asset health helpers', () => {
  it('labels healthy, warning, and overloaded asset states from tier limits', () => {
    expect(assetHealthLabel(getAssetHealthStatus(12, null))).toBe('健康');
    expect(assetHealthLabel(getAssetHealthStatus(100, 100))).toBe('健康');
    expect(assetHealthLabel(getAssetHealthStatus(101, 100))).toBe('预警');
    expect(assetHealthLabel(getAssetHealthStatus(120, 100))).toBe('预警');
    expect(assetHealthLabel(getAssetHealthStatus(121, 100))).toBe('超限');
  });

  it('sorts actresses by video count and update time', () => {
    const rows = [
      actress({ name: 'Beta', video_count: 12, asset_expanded_at: '2026-06-02T00:00:00.000Z' }),
      actress({ name: 'Alpha', video_count: 20, asset_expanded_at: '2026-06-01T00:00:00.000Z' }),
    ];

    expect(sortActresses(rows, 'video_count', 'desc').map((row) => row.name)).toEqual(['Alpha', 'Beta']);
    expect(sortActresses(rows, 'asset_expanded_at', 'desc').map((row) => row.name)).toEqual(['Beta', 'Alpha']);
  });

  it('sorts actresses by cup size and keeps empty cups last in ascending order', () => {
    const rows = [
      actress({ name: 'No Cup', cup: '' }),
      actress({ name: 'H Cup', cup: 'H' }),
      actress({ name: 'A Cup', cup: 'A' }),
    ];

    expect(sortActresses(rows, 'cup', 'asc').map((row) => row.name)).toEqual(['A Cup', 'H Cup', 'No Cup']);
    expect(sortActresses(rows, 'cup', 'desc').map((row) => row.name)).toEqual(['H Cup', 'A Cup', 'No Cup']);
  });

  it('sorts actresses by age and keeps unknown birthdays last', () => {
    const rows = [
      actress({ name: 'Unknown', birthday: '' }),
      actress({ name: 'Older', birthday: '1994年08月16日' }),
      actress({ name: 'Younger', birthday: '2001' }),
    ];

    expect(sortActresses(rows, 'age', 'desc').map((row) => row.name)).toEqual(['Older', 'Younger', 'Unknown']);
    expect(sortActresses(rows, 'age', 'asc').map((row) => row.name)).toEqual(['Younger', 'Older', 'Unknown']);
  });

  it('sorts actresses by career duration and keeps unknown debut years last', () => {
    const rows = [
      actress({ name: 'Unknown', career_from: '' }),
      actress({ name: 'Senior', career_from: '2016年' }),
      actress({ name: 'Newer', career_from: '2023' }),
    ];

    expect(sortActresses(rows, 'career_duration', 'desc').map((row) => row.name)).toEqual(['Senior', 'Newer', 'Unknown']);
    expect(sortActresses(rows, 'career_duration', 'asc').map((row) => row.name)).toEqual(['Newer', 'Senior', 'Unknown']);
  });

  it('sorts retired actresses by their frozen age and career duration', () => {
    const rows = [
      actress({ name: 'Long Career', birthday: '1990', career_from: '2010', career_to: '2020' }),
      actress({ name: 'Short Career', birthday: '1980', career_from: '2018', career_to: '2020' }),
    ];

    expect(sortActresses(rows, 'age', 'desc').map((row) => row.name)).toEqual(['Short Career', 'Long Career']);
    expect(sortActresses(rows, 'career_duration', 'desc').map((row) => row.name)).toEqual(['Long Career', 'Short Career']);
  });
});
