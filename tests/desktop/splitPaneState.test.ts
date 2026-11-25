import {
  clampFunctionPaneWidth,
  clampLogPaneHeight,
  defaultFunctionPaneWidth,
  defaultLogPaneHeight,
} from '../../apps/desktop/renderer/src/splitPaneState';

describe('split pane state', () => {
  it('uses a stable default log height that fits normal desktop windows', () => {
    expect(defaultLogPaneHeight({ viewportHeight: 900 })).toBe(300);
  });

  it('keeps the log pane above its minimum height while dragging upward', () => {
    expect(clampLogPaneHeight(90, { viewportHeight: 900 })).toBe(180);
  });

  it('keeps enough height for the operation pane while dragging downward', () => {
    expect(clampLogPaneHeight(640, { viewportHeight: 780, headerHeight: 72 })).toBe(380);
  });

  it('uses a stable default function pane width that leaves room for logs', () => {
    expect(defaultFunctionPaneWidth({ viewportWidth: 1280 })).toBe(820);
  });

  it('keeps the function pane above its minimum width while dragging left', () => {
    expect(clampFunctionPaneWidth(420, { viewportWidth: 1280 })).toBe(560);
  });

  it('keeps enough width for the log pane while dragging right', () => {
    expect(clampFunctionPaneWidth(900, { viewportWidth: 1100 })).toBe(772);
  });
});
