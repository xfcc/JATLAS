export type SplitPaneHeightOptions = {
  viewportHeight: number;
  headerHeight?: number;
  splitterHeight?: number;
  minOperationPaneHeight?: number;
  minLogPaneHeight?: number;
};

export type SplitPaneWidthOptions = {
  viewportWidth: number;
  splitterWidth?: number;
  minFunctionPaneWidth?: number;
  minLogPaneWidth?: number;
};

const defaultHeaderHeight = 0;
const defaultSplitterHeight = 8;
const defaultMinOperationPaneHeight = 320;
const defaultMinLogPaneHeight = 180;
const preferredLogPaneHeight = 300;
const defaultSplitterWidth = 8;
const defaultMinFunctionPaneWidth = 560;
const defaultMinSideLogPaneWidth = 320;
const preferredFunctionPaneWidth = 820;

function availablePaneHeight(options: SplitPaneHeightOptions) {
  return Math.max(
    0,
    options.viewportHeight - (options.headerHeight ?? defaultHeaderHeight) - (options.splitterHeight ?? defaultSplitterHeight),
  );
}

export function clampLogPaneHeight(rawHeight: number, options: SplitPaneHeightOptions) {
  const minLog = options.minLogPaneHeight ?? defaultMinLogPaneHeight;
  const minOperation = options.minOperationPaneHeight ?? defaultMinOperationPaneHeight;
  const availableHeight = availablePaneHeight(options);
  const maxLog = Math.max(minLog, availableHeight - minOperation);

  return Math.min(Math.max(Math.round(rawHeight), minLog), maxLog);
}

export function defaultLogPaneHeight(options: SplitPaneHeightOptions) {
  return clampLogPaneHeight(preferredLogPaneHeight, options);
}

function availablePaneWidth(options: SplitPaneWidthOptions) {
  return Math.max(0, options.viewportWidth - (options.splitterWidth ?? defaultSplitterWidth));
}

export function clampFunctionPaneWidth(rawWidth: number, options: SplitPaneWidthOptions) {
  const minFunction = options.minFunctionPaneWidth ?? defaultMinFunctionPaneWidth;
  const minLog = options.minLogPaneWidth ?? defaultMinSideLogPaneWidth;
  const availableWidth = availablePaneWidth(options);
  const maxFunction = Math.max(minFunction, availableWidth - minLog);

  return Math.min(Math.max(Math.round(rawWidth), minFunction), maxFunction);
}

export function defaultFunctionPaneWidth(options: SplitPaneWidthOptions) {
  return clampFunctionPaneWidth(preferredFunctionPaneWidth, options);
}
