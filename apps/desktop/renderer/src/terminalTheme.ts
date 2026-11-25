import type { DesktopThemeMode } from '../../core/configService';

export type { DesktopThemeMode };

export const desktopThemeOptions: Array<{ value: DesktopThemeMode; label: string }> = [
  { value: 'dark', label: '深色模式' },
  { value: 'light', label: '浅色模式' },
];

export function normalizeDesktopThemeMode(value: unknown): DesktopThemeMode {
  return value === 'light' ? 'light' : 'dark';
}

export function desktopThemeAttribute(themeMode: DesktopThemeMode) {
  return themeMode === 'light' ? 'terminal-light' : 'terminal-dark';
}
