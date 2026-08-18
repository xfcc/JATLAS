export type TerminalStatusTone = 'ok' | 'running' | 'error' | 'muted';

export function terminalStatusCode(tone: TerminalStatusTone) {
  if (tone === 'ok') return '[正常]';
  if (tone === 'running') return '[运行]';
  if (tone === 'error') return '[错误]';
  return '[--]';
}

export function terminalProgressBar(progress: number, total: number, width = 16) {
  const safeWidth = Math.max(4, Math.floor(width));
  if (total <= 0) return `[${'.'.repeat(safeWidth)}]`;

  const ratio = Math.max(0, Math.min(1, progress / total));
  const filled = Math.round(ratio * safeWidth);
  return `[${'|'.repeat(filled)}${'.'.repeat(safeWidth - filled)}]`;
}
