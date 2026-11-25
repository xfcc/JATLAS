import { normalizeComparableName } from '../../apps/desktop/core/textNormalize';

describe('normalizeComparableName', () => {
  it('unifies NFD (macOS filenames) with NFC (typical DB / IME)', () => {
    const nfc = '三宮つばき';
    const nfd = `三宮つ\u306f\u3099き`;
    expect(nfc).not.toBe(nfd);
    expect(normalizeComparableName(nfd)).toBe(normalizeComparableName(nfc));
    expect(normalizeComparableName(nfd)).toBe('三宮つばき');
  });

  it('trims whitespace', () => {
    expect(normalizeComparableName('  a  ')).toBe('a');
  });
});
