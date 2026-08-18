import {
  formatActressAge,
  formatActressCareerDuration,
  parseProfileYear,
} from '../../apps/desktop/renderer/src/actressProfileMetrics';

const now = new Date('2026-06-15T00:00:00.000Z');

describe('actress profile metrics', () => {
  it('parses profile years from plain and Japanese/Chinese year strings without rewriting the source value', () => {
    expect(parseProfileYear('2023')).toBe(2023);
    expect(parseProfileYear('2023年')).toBe(2023);
    expect(parseProfileYear(' 2023 年 ')).toBe(2023);
    expect(parseProfileYear('2023年04月')).toBe(2023);
    expect(parseProfileYear('unknown')).toBeNull();
  });

  it('formats age from full birth dates and year-only birth dates', () => {
    expect(formatActressAge('2000年06月16日', '', now)).toBe('25岁');
    expect(formatActressAge('2000年06月15日', '', now)).toBe('26岁');
    expect(formatActressAge('2000', '', now)).toBe('26岁');
    expect(formatActressAge('', '', now)).toBe('-');
    expect(formatActressAge('2000年06月16日', '2024年06月15日', now)).toBe('23岁');
    expect(formatActressAge('2000年06月16日', '2024年06月16日', now)).toBe('24岁');
  });

  it('formats career duration from debut year strings to the current year', () => {
    expect(formatActressCareerDuration('2023', '', now)).toBe('3年');
    expect(formatActressCareerDuration('2023年', '', now)).toBe('3年');
    expect(formatActressCareerDuration('2026年', '', now)).toBe('0年');
    expect(formatActressCareerDuration('2012年', '2020年', now)).toBe('8年');
    expect(formatActressCareerDuration('', '', now)).toBe('-');
  });
});
