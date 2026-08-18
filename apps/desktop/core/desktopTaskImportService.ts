import { prisma } from './prismaClient';
import {
  clearDesktopTaskCancel,
  createDesktopTaskId,
  isDesktopTaskCancelRequested,
  setDesktopTaskState,
  type StorageImportSummary,
  type TaskActivityEvent,
} from './desktopTaskStore';

function normalizeComparableName(name: string) {
  return name.normalize('NFC').toLocaleLowerCase();
}

type StorageImportStats = {
  scannedFolders: number;
  validNames: number;
  created: number;
  existingCurrent: number;
  existingOther: number;
  skippedEmpty: number;
  skippedDuplicate: number;
  error: number;
};

function createImportEvent(
  taskId: string,
  index: number,
  subjectName: string,
  result: TaskActivityEvent['result'],
  detail: string,
  subjectId?: number,
  action = '导入演员',
): TaskActivityEvent {
  return {
    id: `${taskId}-${index}`,
    index,
    timestamp: new Date().toISOString(),
    subjectName,
    subjectId,
    actressId: subjectId,
    name: subjectName,
    action,
    result,
    detail,
    retryable: result === 'error',
  };
}

function buildStorageImportSummary(stats: StorageImportStats): StorageImportSummary {
  return {
    total: stats.scannedFolders,
    scannedFolders: stats.scannedFolders,
    validNames: stats.validNames,
    created: stats.created,
    skippedExisting: stats.existingCurrent + stats.existingOther,
    existingCurrent: stats.existingCurrent,
    existingOther: stats.existingOther,
    skippedEmpty: stats.skippedEmpty,
    skippedDuplicate: stats.skippedDuplicate,
    error: stats.error,
  };
}

export function startDesktopStorageImportTask(tierId: number, folderNames: string[], opts?: { onCompleted?: () => void }) {
  const taskId = createDesktopTaskId();
  const startedAt = new Date().toISOString();
  setDesktopTaskState(taskId, {
    taskId,
    kind: 'storage-import',
    title: '批量导入演员',
    progress: 0,
    total: folderNames.length,
    status: 'starting',
    startedAt,
    events: [],
  });

  void (async () => {
    try {
      const tier = await prisma.tier.findUnique({ where: { id: tierId } });
      if (!tier) {
        setDesktopTaskState(taskId, {
          taskId,
          kind: 'storage-import',
          title: '批量导入演员',
          progress: 0,
          total: folderNames.length,
          status: 'error:tier_not_found',
          startedAt,
          finishedAt: new Date().toISOString(),
          events: [],
        });
        return;
      }

      const scope = `${tier.name} 分级`;
      const candidateNames = folderNames.map((name) => name.trim()).filter((name) => name.length > 0);
      const existingRows =
        candidateNames.length > 0
          ? await prisma.actress.findMany({
              where: {
                name: {
                  in: candidateNames,
                },
              },
              select: { name: true, tierId: true, tier: { select: { name: true } } },
            })
          : [];
      const existingByName = new Map(existingRows.map((row) => [normalizeComparableName(row.name), row]));
      const seenNames = new Set<string>();
      const events: TaskActivityEvent[] = [];
      const stats: StorageImportStats = {
        scannedFolders: folderNames.length,
        validNames: 0,
        created: 0,
        existingCurrent: 0,
        existingOther: 0,
        skippedEmpty: 0,
        skippedDuplicate: 0,
        error: 0,
      };

      const flush = (done: number, currentItem: string, last?: TaskActivityEvent) => {
        setDesktopTaskState(taskId, {
          taskId,
          kind: 'storage-import',
          title: '批量导入演员',
          scope,
          progress: done,
          total: folderNames.length,
          status: 'processing',
          startedAt,
          currentItem,
          lastProcessedItem: last
            ? {
                name: last.subjectName,
                result: last.result === 'error' ? 'error' : last.result === 'skipped' ? 'skipped' : 'success',
                detail: last.detail,
              }
            : undefined,
          events: [...events],
          summary: buildStorageImportSummary(stats),
        });
      };

      setDesktopTaskState(taskId, {
        taskId,
        kind: 'storage-import',
        title: '批量导入演员',
        scope,
        progress: 0,
        total: folderNames.length,
        status: 'processing',
        startedAt,
        events: [],
        summary: buildStorageImportSummary(stats),
      });

      for (let i = 0; i < folderNames.length; i++) {
        if (isDesktopTaskCancelRequested(taskId)) {
          setDesktopTaskState(taskId, {
            taskId,
            kind: 'storage-import',
            title: '批量导入演员',
            scope,
            progress: i,
            total: folderNames.length,
            status: 'completed:cancelled',
            startedAt,
            finishedAt: new Date().toISOString(),
            events: [...events],
            summary: buildStorageImportSummary(stats),
          });
          return;
        }

        const rawName = folderNames[i];
        const name = rawName.trim();
        const index = i + 1;
        if (!name) {
          stats.skippedEmpty++;
          flush(index, '未命名文件夹');
          continue;
        }

        const normalized = normalizeComparableName(name);
        if (seenNames.has(normalized)) {
          stats.skippedDuplicate++;
          flush(index, name);
          continue;
        }
        seenNames.add(normalized);
        stats.validNames++;

        const existing = existingByName.get(normalized);
        if (existing) {
          if (existing.tierId === tierId) {
            stats.existingCurrent++;
            flush(index, name);
          } else {
            stats.existingOther++;
            const event = createImportEvent(
              taskId,
              index,
              name,
              'skipped',
              `已存在于 ${existing.tier.name} 分级`,
              undefined,
              '存在于其他分级',
            );
            events.push(event);
            flush(index, name, event);
          }
          continue;
        }

        try {
          const created = await prisma.$transaction(async (tx) => {
            const row = await tx.actress.create({
              data: {
                name,
                tierId,
                video_count: 0,
                emby_id: '[]',
              },
            });
            await tx.assetLog.create({
              data: {
                actress_id: row.id,
                actress_name: row.name,
                action_type: 'CREATE',
                video_delta: 0,
              },
            });
            return row;
          });
          existingByName.set(normalized, {
            name: created.name,
            tierId,
            tier: { name: tier.name },
          });
          const event = createImportEvent(
            taskId,
            index,
            name,
            'created',
            `已新增到 ${tier.name} 分级，演员 ID #${created.id}`,
            created.id,
            '新增演员',
          );
          stats.created++;
          events.push(event);
          flush(index, name, event);
        } catch (e) {
          const event = createImportEvent(
            taskId,
            index,
            name,
            'error',
            e instanceof Error ? e.message : '数据库写入失败',
            undefined,
            '写入失败',
          );
          stats.error++;
          events.push(event);
          flush(index, name, event);
        }
      }

      setDesktopTaskState(taskId, {
        taskId,
        kind: 'storage-import',
        title: '批量导入演员',
        scope,
        progress: folderNames.length,
        total: folderNames.length,
        status: 'completed',
        startedAt,
        finishedAt: new Date().toISOString(),
        events,
        summary: buildStorageImportSummary(stats),
      });
      opts?.onCompleted?.();
    } finally {
      clearDesktopTaskCancel(taskId);
    }
  })();

  return { taskId };
}
