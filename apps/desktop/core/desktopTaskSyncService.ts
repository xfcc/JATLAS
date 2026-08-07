import { fetchActressCountFromEmby, fetchEmbyIdsByName } from './embyApi';
import { normalizeEmbyIdList, toEmbyIdJson } from './embyIdJsonDesktop';
import { prisma } from './prismaClient';
import {
  clearDesktopTaskCancel,
  createDesktopTaskId,
  isDesktopTaskCancelRequested,
  setDesktopTaskState,
  type EmbyIdSyncSummary,
  type TaskActivityEvent,
  type TierSyncLogEvent,
  type TierSyncSummary,
} from './desktopTaskStore';

function buildTierSummary(events: TierSyncLogEvent[]): TierSyncSummary {
  let success = 0;
  let skipped = 0;
  let error = 0;
  let netDelta = 0;
  let increasedTotal = 0;
  let decreasedAbsTotal = 0;
  let changedCount = 0;
  let unchangedCount = 0;

  for (const e of events) {
    if (e.result === 'skipped') skipped++;
    else if (e.result === 'error') error++;
    else if (e.result === 'success') {
      success++;
      if (e.delta === null) continue;
      netDelta += e.delta;
      if (e.delta > 0) increasedTotal += e.delta;
      if (e.delta < 0) decreasedAbsTotal += -e.delta;
      if (e.delta !== 0) changedCount++;
      else unchangedCount++;
    }
  }

  return {
    total: events.length,
    success,
    skipped,
    error,
    netDelta,
    increasedTotal,
    decreasedAbsTotal,
    changedCount,
    unchangedCount,
  };
}

export function startDesktopSyncEmbyIdsTask(
  actressIds: Array<string | number>,
  opts?: { onCompleted?: () => void },
) {
  const taskId = createDesktopTaskId();
  const startedAt = new Date().toISOString();
  const title = '批量补全 Emby ID';
  const summary: EmbyIdSyncSummary = {
    total: actressIds.length,
    existingEmbyId: 0,
    bound: 0,
    notFound: 0,
    error: 0,
  };
  const events: TaskActivityEvent[] = [];
  let scope: string | undefined;
  let scopeTierId: number | null = null;

  const flush = (
    done: number,
    last?: { name: string; result: 'success' | 'skipped' | 'error'; detail: string },
    status = 'processing',
    finishedAt?: string,
  ) => {
    setDesktopTaskState(taskId, {
      taskId,
      kind: 'emby-id-sync',
      title,
      scope,
      progress: done,
      total: actressIds.length,
      status,
      startedAt,
      finishedAt,
      currentItem: last?.name,
      events: [...events],
      lastProcessedItem: last,
      summary: { ...summary },
    });
  };

  const updateScope = (actress: { tierId: number; tier?: { name: string } | null }) => {
    if (!actress.tier) return;
    if (scopeTierId === null) {
      scopeTierId = actress.tierId;
      scope = `${actress.tier.name} 分级`;
      return;
    }
    if (scopeTierId !== actress.tierId) {
      scope = '多分级';
    }
  };

  const pushEvent = (
    index: number,
    actressId: number,
    subjectName: string,
    action: string,
    result: TaskActivityEvent['result'],
    detail: string,
  ) => {
    events.push({
      id: `${taskId}-${index}`,
      index,
      timestamp: new Date().toISOString(),
      actressId,
      subjectId: actressId,
      subjectName,
      name: subjectName,
      action,
      result,
      detail,
    });
  };

  flush(0);

  void (async () => {
    try {
    for (let i = 0; i < actressIds.length; i++) {
      if (isDesktopTaskCancelRequested(taskId)) {
        flush(i, undefined, 'completed:cancelled', new Date().toISOString());
        return;
      }
      const actressId = parseInt(String(actressIds[i]), 10);
      let subjectName = `ID: ${actressId}`;
      try {
        const actress = await prisma.actress.findUnique({ where: { id: actressId }, include: { tier: true } });
        if (!actress) {
          summary.error++;
          pushEvent(i + 1, actressId, subjectName, '同步失败', 'error', '演员不存在');
          flush(i + 1, { name: subjectName, result: 'error', detail: '演员不存在' });
          continue;
        }
        subjectName = actress.name;
        updateScope(actress);

        const actressEmbyIds = normalizeEmbyIdList(actress.emby_id);
        if (actressEmbyIds.length > 0) {
          summary.existingEmbyId++;
          flush(i + 1, { name: actress.name, result: 'skipped', detail: '已存在 Emby ID，已跳过' });
          continue;
        }

        const ids = await fetchEmbyIdsByName(actress.name);
        if (ids.length === 0) {
          summary.notFound++;
          pushEvent(i + 1, actress.id, actress.name, 'Emby 未找到', 'skipped', '按演员名未找到匹配');
          flush(i + 1, { name: actress.name, result: 'skipped', detail: '按演员名未找到匹配' });
          continue;
        }

        await prisma.actress.update({
          where: { id: actressId },
          data: { emby_id: toEmbyIdJson(ids) },
        });
        summary.bound++;
        const detail = `${ids.length} 个 ID：${ids.join(', ')}`;
        pushEvent(i + 1, actress.id, actress.name, '新增绑定', 'updated', detail);
        flush(i + 1, { name: actress.name, result: 'success', detail });
      } catch (e) {
        const detail = e instanceof Error ? e.message : '数据库或 Emby 请求失败';
        summary.error++;
        pushEvent(i + 1, actressId, subjectName, '同步失败', 'error', detail);
        flush(i + 1, { name: subjectName, result: 'error', detail });
      }
    }

    flush(actressIds.length, undefined, 'completed', new Date().toISOString());
    opts?.onCompleted?.();
    } finally {
      clearDesktopTaskCancel(taskId);
    }
  })();

  return { taskId };
}

export function startDesktopSyncMovieCountsTask(
  actressIds: Array<string | number>,
  opts?: { onCompleted?: () => void },
) {
  const taskId = createDesktopTaskId();
  setDesktopTaskState(taskId, { progress: 0, total: actressIds.length, status: 'processing' });

  void (async () => {
    try {
    let successfulCount = 0;
    for (let i = 0; i < actressIds.length; i++) {
      if (isDesktopTaskCancelRequested(taskId)) {
    setDesktopTaskState(taskId, {
          progress: i,
          total: actressIds.length,
          status: 'completed:cancelled',
        });
        return;
      }
      const actressId = parseInt(String(actressIds[i]), 10);
      try {
        const actress = await prisma.actress.findUnique({ where: { id: actressId } });
        if (!actress) {
    setDesktopTaskState(taskId, {
            progress: i + 1,
            total: actressIds.length,
            status: `processing (${successfulCount} successful)`,
            lastProcessedItem: { name: `ID: ${actressId}`, result: 'error', detail: '演员不存在' },
          });
          continue;
        }
        const actressEmbyIds = normalizeEmbyIdList(actress.emby_id);
        if (actressEmbyIds.length === 0) {
    setDesktopTaskState(taskId, {
            progress: i + 1,
            total: actressIds.length,
            status: `processing (${successfulCount} successful)`,
            lastProcessedItem: { name: actress.name, result: 'skipped', detail: '未关联 Emby ID，已跳过' },
          });
          continue;
        }

        const uniqueEmbyPersonIds = Array.from(new Set(actressEmbyIds));
        const newCount = await fetchActressCountFromEmby(uniqueEmbyPersonIds);
        const videoDelta = newCount - actress.video_count;

        if (videoDelta !== 0) {
          await prisma.actress.update({
            where: { id: actressId },
            data: { video_count: newCount, asset_updated_at: new Date() },
          });
          await prisma.assetLog.create({
            data: {
              actress_id: actressId,
              actress_name: actress.name,
              action_type: 'UPDATE',
              video_delta: videoDelta,
            },
          });
        }

        successfulCount++;
    setDesktopTaskState(taskId, {
          progress: i + 1,
          total: actressIds.length,
          status: `processing (${successfulCount} successful)`,
          lastProcessedItem: {
            name: actress.name,
            result: 'success',
            detail: videoDelta === 0 ? '库存无变化' : `已同步为 ${newCount} 部`,
          },
        });
      } catch (e) {
        const detail = e instanceof Error ? e.message : typeof e === 'string' ? e : '同步失败';
    setDesktopTaskState(taskId, {
          progress: i + 1,
          total: actressIds.length,
          status: `processing (${successfulCount} successful)`,
          lastProcessedItem: { name: `ID: ${actressId}`, result: 'error', detail },
        });
      }
    }

    setDesktopTaskState(taskId, {
      progress: actressIds.length,
      total: actressIds.length,
      status: `completed (${successfulCount} successful)`,
    });
    opts?.onCompleted?.();
    } finally {
      clearDesktopTaskCancel(taskId);
    }
  })();

  return { taskId };
}

export function startDesktopTierVideoCountSyncTask(tierId: number, opts?: { onCompleted?: () => void }) {
  const taskId = createDesktopTaskId();
  const startedAt = new Date().toISOString();
    setDesktopTaskState(taskId, {
    taskId,
    kind: 'video-count-sync',
    title: '批量刷新影片数量',
    progress: 0,
    total: 0,
    status: 'starting',
    startedAt,
  });

  void (async () => {
    try {
    const tier = await prisma.tier.findUnique({ where: { id: tierId } });
    if (!tier) {
    setDesktopTaskState(taskId, {
        taskId,
        kind: 'video-count-sync',
        title: '批量刷新影片数量',
        progress: 0,
        total: 0,
        status: 'error:tier_not_found',
        startedAt,
        finishedAt: new Date().toISOString(),
        events: [],
      });
      return;
    }
    const scope = `${tier.name} 分级`;

    const actresses = await prisma.actress.findMany({
      where: { tierId },
      orderBy: { id: 'asc' },
    });
    const events: TierSyncLogEvent[] = [];

    const flush = (
      done: number,
      last?: { name: string; result: 'success' | 'skipped' | 'error'; detail: string },
    ) => {
    setDesktopTaskState(taskId, {
        taskId,
        kind: 'video-count-sync',
        title: '批量刷新影片数量',
        scope,
        progress: done,
        total: actresses.length,
        status: 'processing',
        startedAt,
        currentItem: last?.name,
        events: [...events],
        lastProcessedItem: last,
      });
    };

    setDesktopTaskState(taskId, {
      taskId,
      kind: 'video-count-sync',
      title: '批量刷新影片数量',
      scope,
      progress: 0,
      total: actresses.length,
      status: 'processing',
      startedAt,
      events: [],
    });
    if (actresses.length === 0) {
    setDesktopTaskState(taskId, {
        taskId,
        kind: 'video-count-sync',
        title: '批量刷新影片数量',
        scope,
        progress: 0,
        total: 0,
        status: 'completed',
        startedAt,
        finishedAt: new Date().toISOString(),
        events: [],
        summary: buildTierSummary(events),
      });
      opts?.onCompleted?.();
      return;
    }

    for (let i = 0; i < actresses.length; i++) {
      if (isDesktopTaskCancelRequested(taskId)) {
    setDesktopTaskState(taskId, {
          taskId,
          kind: 'video-count-sync',
          title: '批量刷新影片数量',
          scope,
          progress: i,
          total: actresses.length,
          status: 'completed:cancelled',
          startedAt,
          finishedAt: new Date().toISOString(),
          events: [...events],
          summary: buildTierSummary(events),
        });
        return;
      }
      const actress = actresses[i];
      try {
        const actressEmbyIds = normalizeEmbyIdList(actress.emby_id);
        if (actressEmbyIds.length === 0) {
          const ev: TierSyncLogEvent = {
            id: `${taskId}-${i + 1}`,
            index: i + 1,
            timestamp: new Date().toISOString(),
            actressId: actress.id,
            subjectId: actress.id,
            subjectName: actress.name,
            name: actress.name,
            action: '刷新影片数量',
            result: 'skipped',
            before: actress.video_count,
            after: null,
            oldCount: actress.video_count,
            newCount: null,
            delta: null,
            detail: '未关联 Emby ID，已跳过',
          };
          events.push(ev);
          flush(i + 1, { name: actress.name, result: 'skipped', detail: ev.detail });
          continue;
        }

        const uniqueEmbyPersonIds = Array.from(new Set(actressEmbyIds));
        const newCount = await fetchActressCountFromEmby(uniqueEmbyPersonIds);
        const videoDelta = newCount - actress.video_count;

        if (videoDelta !== 0) {
          await prisma.actress.update({
            where: { id: actress.id },
            data: { video_count: newCount, asset_updated_at: new Date() },
          });
          await prisma.assetLog.create({
            data: {
              actress_id: actress.id,
              actress_name: actress.name,
              action_type: 'UPDATE',
              video_delta: videoDelta,
            },
          });
        }

        const ev: TierSyncLogEvent = {
          id: `${taskId}-${i + 1}`,
          index: i + 1,
          timestamp: new Date().toISOString(),
          actressId: actress.id,
          subjectId: actress.id,
          subjectName: actress.name,
          name: actress.name,
          action: '刷新影片数量',
          result: 'success',
          before: actress.video_count,
          after: newCount,
          oldCount: actress.video_count,
          newCount,
          delta: videoDelta,
          detail: videoDelta === 0 ? '库存无变化' : `已同步为 ${newCount} 部`,
        };
        events.push(ev);
        flush(i + 1, { name: actress.name, result: 'success', detail: ev.detail });
      } catch (e) {
        const detail = e instanceof Error ? e.message : typeof e === 'string' ? e : '同步失败';
        const ev: TierSyncLogEvent = {
          id: `${taskId}-${i + 1}`,
          index: i + 1,
          timestamp: new Date().toISOString(),
          actressId: actress.id,
          subjectId: actress.id,
          subjectName: actress.name,
          name: actress.name,
          action: '刷新影片数量',
          result: 'error',
          before: actress.video_count,
          after: null,
          oldCount: actress.video_count,
          newCount: null,
          delta: null,
          detail,
        };
        events.push(ev);
        flush(i + 1, { name: actress.name, result: 'error', detail });
      }
    }

    setDesktopTaskState(taskId, {
      taskId,
      kind: 'video-count-sync',
      title: '批量刷新影片数量',
      scope,
      progress: actresses.length,
      total: actresses.length,
      status: 'completed',
      startedAt,
      finishedAt: new Date().toISOString(),
      events,
      summary: buildTierSummary(events),
    });
    opts?.onCompleted?.();
    } finally {
      clearDesktopTaskCancel(taskId);
    }
  })();

  return { taskId };
}
