import type { PrismaClient } from '@prisma/client';
import type { DeepMockProxy } from 'jest-mock-extended';

jest.mock('../../apps/desktop/core/prismaClient', () => {
  const { mockDeep } = jest.requireActual('jest-mock-extended') as typeof import('jest-mock-extended');
  return { prisma: mockDeep<PrismaClient>() };
});

jest.mock('../../apps/desktop/core/embyApi', () => ({
  fetchActressCountFromEmby: jest.fn(),
  fetchEmbyIdsByName: jest.fn(),
}));

import { fetchActressCountFromEmby } from '../../apps/desktop/core/embyApi';
import { prisma } from '../../apps/desktop/core/prismaClient';
import { desktopTasks, getDesktopTaskState } from '../../apps/desktop/core/desktopTaskStore';
import { startDesktopSyncMovieCountsTask } from '../../apps/desktop/core/desktopTaskSyncService';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
const fetchCountMock = fetchActressCountFromEmby as jest.MockedFunction<typeof fetchActressCountFromEmby>;

async function waitForTerminalTask(taskId: string) {
  for (let i = 0; i < 40; i++) {
    const state = getDesktopTaskState(taskId);
    if (state?.phase === 'completed' || state?.phase === 'cancelled' || state?.phase === 'failed') return state;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Task ${taskId} did not finish`);
}

describe('desktop movie count sync task', () => {
  beforeEach(() => {
    desktopTasks.clear();
    jest.clearAllMocks();
  });

  it('uses the full batch log contract for selected actresses and only advances expansion time on increases', async () => {
    prismaMock.actress.findUnique
      .mockResolvedValueOnce({ id: 1, name: 'Increase', video_count: 10, emby_id: '["a"]' } as never)
      .mockResolvedValueOnce({ id: 2, name: 'Decrease', video_count: 10, emby_id: '["b"]' } as never);
    fetchCountMock.mockResolvedValueOnce(12).mockResolvedValueOnce(8);
    prismaMock.actress.update.mockResolvedValue({} as never);
    prismaMock.assetLog.create.mockResolvedValue({} as never);

    const { taskId } = startDesktopSyncMovieCountsTask([1, 2]);
    const state = await waitForTerminalTask(taskId);

    expect(state).toMatchObject({
      kind: 'video-count-sync',
      title: '批量刷新影片数量',
      progress: 2,
      total: 2,
      status: 'completed',
      summary: {
        changedCount: 2,
        increasedTotal: 2,
        decreasedAbsTotal: 2,
        netDelta: 0,
      },
    });
    expect(state.events).toEqual([
      expect.objectContaining({ subjectName: 'Increase', before: 10, after: 12, delta: 2, action: '刷新影片数量' }),
      expect.objectContaining({ subjectName: 'Decrease', before: 10, after: 8, delta: -2, action: '刷新影片数量' }),
    ]);
    expect(prismaMock.actress.update).toHaveBeenNthCalledWith(1, {
      where: { id: 1 },
      data: { video_count: 12, asset_updated_at: expect.any(Date) },
    });
    expect(prismaMock.actress.update).toHaveBeenNthCalledWith(2, {
      where: { id: 2 },
      data: { video_count: 8 },
    });
  });

  it('uses the same event and summary fields for a single-actress refresh', async () => {
    prismaMock.actress.findUnique.mockResolvedValue({ id: 1, name: 'Single', video_count: 10, emby_id: '["a"]' } as never);
    fetchCountMock.mockResolvedValue(10);

    const { taskId } = startDesktopSyncMovieCountsTask([1]);
    const state = await waitForTerminalTask(taskId);

    expect(state).toMatchObject({
      kind: 'video-count-sync',
      title: '刷新影片数量',
      scope: 'Single',
      summary: { total: 1, changedCount: 0, unchangedCount: 1 },
    });
    expect(state.events).toEqual([
      expect.objectContaining({ subjectName: 'Single', before: 10, after: 10, delta: 0, result: 'success' }),
    ]);
  });
});
