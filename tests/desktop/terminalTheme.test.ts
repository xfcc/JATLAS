import {
  desktopThemeAttribute,
  desktopThemeOptions,
  normalizeDesktopThemeMode,
} from '../../apps/desktop/renderer/src/terminalTheme';

describe('terminal theme presentation', () => {
  it('uses Chinese labels for the two selectable modes', () => {
    expect(desktopThemeOptions).toEqual([
      { value: 'dark', label: '深色模式' },
      { value: 'light', label: '浅色模式' },
    ]);
  });

  it('uses dark mode when the stored theme value is missing or invalid', () => {
    expect(normalizeDesktopThemeMode(undefined)).toBe('dark');
    expect(normalizeDesktopThemeMode('light')).toBe('light');
    expect(normalizeDesktopThemeMode('terminal-light')).toBe('dark');
  });

  it('maps the selected mode to the app data-theme attribute', () => {
    expect(desktopThemeAttribute('dark')).toBe('terminal-dark');
    expect(desktopThemeAttribute('light')).toBe('terminal-light');
  });
});
