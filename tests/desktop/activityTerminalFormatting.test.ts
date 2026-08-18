import { formatActivityTerminalLines, type ActivitySnapshot } from '../../apps/desktop/renderer/src/activityTerminalFormatting';

describe('activity terminal formatting', () => {
  it('places batch activity summaries after all detail events', () => {
    const activity: ActivitySnapshot = {
      activityId: 'task-1',
      kind: 'storage-import',
      title: '批量导入演员',
      scope: 'S 分类',
      status: 'completed',
      progress: 2,
      total: 2,
      summaryText: '扫描 2 个文件夹，识别 2 个有效演员名。',
      startedAt: '2026-06-22T10:00:00.000Z',
      finishedAt: '2026-06-22T10:01:00.000Z',
      events: [
        {
          id: 'event-1',
          index: 1,
          timestamp: '2026-06-22T10:00:30.000Z',
          subjectName: '三上悠亚',
          action: '导入演员',
          result: 'success',
          detail: '已创建',
        },
        {
          id: 'event-2',
          index: 2,
          timestamp: '2026-06-22T10:00:31.000Z',
          subjectName: '奥田咲',
          action: '导入演员',
          result: 'skipped',
          detail: '已存在',
        },
      ],
    };

    expect(formatActivityTerminalLines(activity).map((line) => line.kind)).toEqual([
      'command',
      'status',
      'event',
      'event',
      'summary',
    ]);
  });
});
