export type TierSyncLogEvent = {
  id?: string;
  index?: number;
  timestamp?: string;
  actressId: number;
  subjectId?: number;
  subjectName?: string;
  name: string;
  action?: string;
  result: 'success' | 'skipped' | 'error';
  before?: number | string | null;
  after?: number | string | null;
  oldCount: number | null;
  newCount: number | null;
  delta: number | null;
  detail: string;
  retryable?: boolean;
};

export type TierSyncSummary = {
  total: number;
  success: number;
  skipped: number;
  error: number;
  netDelta: number;
  increasedTotal: number;
  decreasedAbsTotal: number;
  changedCount: number;
  unchangedCount: number;
};

export type StorageImportSummary = {
  total: number;
  scannedFolders: number;
  validNames: number;
  created: number;
  skippedExisting: number;
  existingCurrent: number;
  existingOther: number;
  skippedEmpty: number;
  skippedDuplicate: number;
  error: number;
};

export type EmbyIdSyncSummary = {
  total: number;
  existingEmbyId: number;
  bound: number;
  notFound: number;
  error: number;
};

export type TaskSummary = Partial<TierSyncSummary & StorageImportSummary & EmbyIdSyncSummary> &
  Record<string, number | undefined>;

export type TaskActivityEvent = {
  id: string;
  index: number;
  timestamp: string;
  subjectName: string;
  subjectId?: number;
  actressId?: number;
  name?: string;
  action: string;
  result: 'created' | 'updated' | 'unchanged' | 'success' | 'skipped' | 'error';
  before?: number | string | null;
  after?: number | string | null;
  oldCount?: number | null;
  newCount?: number | null;
  delta?: number | null;
  detail: string;
  retryable?: boolean;
};

export type TaskPhase = 'queued' | 'running' | 'completed' | 'cancelled' | 'failed';

export type TaskState = {
  taskId?: string;
  kind?: 'storage-import' | 'video-count-sync' | 'emby-id-sync' | 'database-change' | 'storage-scan';
  title?: string;
  scope?: string;
  progress: number;
  total: number;
  phase: TaskPhase;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  currentItem?: string;
  lastProcessedItem?: {
    name: string;
    result: 'success' | 'skipped' | 'error';
    detail: string;
  };
  events?: Array<TierSyncLogEvent | TaskActivityEvent>;
  summary?: TaskSummary;
};

export type TaskStateInput = Omit<TaskState, 'phase'> & { phase?: TaskPhase };

const MAX_RETAINED_TASKS = 100;

const globalTasks = globalThis as typeof globalThis & {
  __JATLAS_DESKTOP_SYNC_TASKS__?: Map<string, TaskState>;
};

export const desktopTasks: Map<string, TaskState> =
  globalTasks.__JATLAS_DESKTOP_SYNC_TASKS__ ?? (globalTasks.__JATLAS_DESKTOP_SYNC_TASKS__ = new Map());

const cancelRequested = new Set<string>();

export function requestCancelDesktopTask(taskId: string) {
  cancelRequested.add(taskId);
}

export function isDesktopTaskCancelRequested(taskId: string) {
  return cancelRequested.has(taskId);
}

export function clearDesktopTaskCancel(taskId: string) {
  cancelRequested.delete(taskId);
}

export function createDesktopTaskId() {
  return randomUUID();
}

export function taskPhaseFromStatus(status: string): TaskPhase {
  if (status === 'starting') return 'queued';
  if (status === 'completed:cancelled') return 'cancelled';
  if (status.startsWith('completed')) return 'completed';
  if (status.startsWith('error:')) return 'failed';
  return 'running';
}

export function isDesktopTaskTerminal(task: Pick<TaskState, 'phase'>) {
  return task.phase === 'completed' || task.phase === 'cancelled' || task.phase === 'failed';
}

function pruneDesktopTasks() {
  if (desktopTasks.size <= MAX_RETAINED_TASKS) return;
  for (const [taskId, task] of desktopTasks) {
    if (!isDesktopTaskTerminal(task)) continue;
    desktopTasks.delete(taskId);
    clearDesktopTaskCancel(taskId);
    if (desktopTasks.size <= MAX_RETAINED_TASKS) return;
  }
}

export function setDesktopTaskState(taskId: string, input: TaskStateInput) {
  const task = { ...input, phase: input.phase ?? taskPhaseFromStatus(input.status) } satisfies TaskState;
  desktopTasks.set(taskId, task);
  pruneDesktopTasks();
  return task;
}

export function getDesktopTaskState(taskId: string) {
  const task = desktopTasks.get(taskId);
  if (!task) return null;
  if (!task.phase) {
    task.phase = taskPhaseFromStatus(task.status);
  }
  return task;
}
import { randomUUID } from 'node:crypto';
