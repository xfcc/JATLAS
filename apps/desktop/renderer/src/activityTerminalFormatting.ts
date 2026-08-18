import type { TaskActivityEvent, TaskState } from '../../core/desktopTaskStore';
import type { TerminalStatusTone } from './terminalDesign';

export type ActivitySnapshot = {
  activityId: string;
  kind?: TaskState['kind'];
  title: string;
  scope?: string;
  status: string;
  progress: number;
  total: number;
  summaryText?: string;
  events: TaskActivityEvent[];
  startedAt?: string;
  finishedAt?: string;
};

export type ActivityTerminalLine = {
  id: string;
  kind: 'command' | 'status' | 'summary' | 'event';
  tone?: TerminalStatusTone;
  text: string;
};

function activityStatusText(activity: ActivitySnapshot) {
  if (activity.status === 'processing') return '执行中';
  if (activity.status === 'starting') return '准备中';
  if (activity.status === 'completed') return activity.events.some((event) => event.result === 'error') ? '存在失败' : '已完成';
  if (activity.status === 'completed:cancelled') return '已取消';
  if (activity.status.startsWith('error:')) return '失败';
  return activity.status;
}

function activityStatusTone(activity: ActivitySnapshot): TerminalStatusTone {
  if (activity.status === 'processing' || activity.status === 'starting') return 'running';
  if (activity.status.startsWith('error:')) return 'error';
  if (activity.status === 'completed' && activity.events.some((event) => event.result === 'error')) return 'error';
  if (activity.status === 'completed' || activity.status === 'completed:cancelled') return 'ok';
  return 'muted';
}

function formatNumberValue(value: number | string | null | undefined) {
  return value === null || value === undefined || value === '' ? '-' : String(value);
}

function formatDelta(delta: number | null | undefined) {
  if (delta === null || delta === undefined) return '';
  return delta > 0 ? `+${delta}` : String(delta);
}

function formatActivityTime(value?: string) {
  if (!value) return new Date().toLocaleTimeString('zh-CN', { hour12: false });
  return new Date(value).toLocaleTimeString('zh-CN', { hour12: false });
}

function formatTerminalEventLine(event: TaskActivityEvent): ActivityTerminalLine {
  const status = event.result.toUpperCase();
  const index = String(event.index).padStart(3, '0');
  const change =
    event.before !== undefined || event.after !== undefined
      ? ` ${formatNumberValue(event.before)} -> ${formatNumberValue(event.after)}`
      : '';
  const delta = event.delta !== undefined && event.delta !== null ? ` ${formatDelta(event.delta)}` : '';
  return {
    id: event.id,
    kind: 'event',
    tone: event.result === 'error' ? 'error' : event.result === 'skipped' ? 'muted' : 'ok',
    text: `[${index}] ${status} ${event.subjectName} :: ${event.action}${change}${delta} :: ${event.detail}`,
  };
}

export function formatActivityTerminalLines(activity: ActivitySnapshot): ActivityTerminalLine[] {
  const tone = activityStatusTone(activity);
  const lines: ActivityTerminalLine[] = [
    {
      id: `${activity.activityId}-command`,
      kind: 'command',
      text: `${formatActivityTime(activity.startedAt)} $ ${activity.title}${activity.scope ? ` -- ${activity.scope}` : ''}`,
    },
    {
      id: `${activity.activityId}-status`,
      kind: 'status',
      tone,
      text: `${formatActivityTime(activity.finishedAt ?? activity.startedAt)} [${tone.toUpperCase()}] ${activityStatusText(activity)} ${activity.progress}/${activity.total}`,
    },
    ...activity.events.map((event) => formatTerminalEventLine(event)),
  ];

  if (activity.summaryText) {
    lines.push({
      id: `${activity.activityId}-summary`,
      kind: 'summary',
      text: `# ${activity.summaryText}`,
    });
  }

  return lines;
}
