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

import { fetchEmbyIdsByName } from '../../apps/desktop/core/embyApi';
import { prisma } from '../../apps/desktop/core/prismaClient';
import { desktopTasks, getDesktopTaskState } from '../../apps/desktop/core/desktopTaskStore';
import { startDesktopSyncEmbyIdsTask } from '../../apps/desktop/core/desktopTaskSyncService';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;
const fetchEmbyIdsByNameMock = fetchEmbyIdsByName as jest.MockedFunction<typeof fetchEmbyIdsByName>;

async function waitForTerminalTask(taskId: string) {
  for (let i = 0; i < 40; i++) {
    const state = getDesktopTaskState(taskId);
    if (state && (state.status === 'completed' || state.status === 'completed:cancelled' || state.status.startsWith('error:'))) {
      return state;
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Task ${taskId} did not finish`);
}

describe('desktop Emby ID sync task', () => {
  beforeEach(() => {
    desktopTasks.clear();
    jest.clearAllMocks();
  });

  it('summarizes existing IDs and only emits important Emby ID sync events', async () => {
    const now = new Date();
    const tier = {
      id: 1,
      name: 'S',
      video_limit: null,
      total_video_limit: null,
      status: 'active',
      created_at: now,
      updated_at: now,
    };
    prismaMock.actress.findUnique
      .mockResolvedValueOnce({
        id: 1,
        name: 'Mikami Yua',
        tierId: 1,
        tier,
        video_count: 18,
        emby_id: '[]',
        created_at: now,
        updated_at: now,
      } as never)
      .mockResolvedValueOnce({
        id: 2,
        name: 'Existing Name',
        tierId: 1,
        tier,
        video_count: 12,
        emby_id: '["already"]',
        created_at: now,
        updated_at: now,
      } as never)
      .mockResolvedValueOnce({
        id: 3,
        name: 'Example A',
        tierId: 1,
        tier,
        video_count: 8,
        emby_id: '[]',
        created_at: now,
        updated_at: now,
      } as never)
      .mockResolvedValueOnce({
        id: 4,
        name: 'Another Name',
        tierId: 1,
        tier,
        video_count: 4,
        emby_id: '[]',
        created_at: now,
        updated_at: now,
      } as never);
    fetchEmbyIdsByNameMock
      .mockResolvedValueOnce(['12345', '67890'])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('Emby 请求超时'));
    prismaMock.actress.update.mockResolvedValue({} as never);

    const { taskId } = startDesktopSyncEmbyIdsTask([1, 2, 3, 4]);
    const state = await waitForTerminalTask(taskId);

    expect(state.kind).toBe('emby-id-sync');
    expect(state.title).toBe('批量补全 Emby ID');
    expect(state.scope).toBe('S 分级');
    expect(state.progress).toBe(4);
    expect(state.total).toBe(4);
    expect(state.summary).toMatchObject({
      total: 4,
      existingEmbyId: 1,
      bound: 1,
      notFound: 1,
      error: 1,
    });
    expect(state.events).toEqual([
      expect.objectContaining({
        index: 1,
        subjectName: 'Mikami Yua',
        action: '新增绑定',
        result: 'updated',
        subjectId: 1,
        detail: '2 个 ID：12345, 67890',
      }),
      expect.objectContaining({
        index: 3,
        subjectName: 'Example A',
        action: 'Emby 未找到',
        result: 'skipped',
        subjectId: 3,
        detail: '按演员名未找到匹配',
      }),
      expect.objectContaining({
        index: 4,
        subjectName: 'Another Name',
        action: '同步失败',
        result: 'error',
        subjectId: 4,
        detail: 'Emby 请求超时',
      }),
    ]);
    expect(prismaMock.actress.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { emby_id: '["12345","67890"]' },
    });
  });
});
