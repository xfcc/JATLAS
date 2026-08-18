import type { PrismaClient } from '@prisma/client';
import type { DeepMockProxy } from 'jest-mock-extended';

jest.mock('../../apps/desktop/core/prismaClient', () => {
  const { mockDeep } = jest.requireActual('jest-mock-extended') as typeof import('jest-mock-extended');
  return { prisma: mockDeep<PrismaClient>() };
});

import { prisma } from '../../apps/desktop/core/prismaClient';
import { desktopTasks, getDesktopTaskState } from '../../apps/desktop/core/desktopTaskStore';
import { startDesktopStorageImportTask } from '../../apps/desktop/core/desktopTaskImportService';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

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

describe('desktop storage import task', () => {
  beforeEach(() => {
    desktopTasks.clear();
    jest.clearAllMocks();
  });

  it('summarizes current-tier existing names and only emits important import events', async () => {
    const now = new Date();
    prismaMock.tier.findUnique.mockResolvedValue({
      id: 1,
      name: 'S',
      video_limit: null,
      total_video_limit: null,
      status: 'active',
      created_at: now,
      updated_at: now,
    });
    prismaMock.actress.findMany.mockResolvedValue([
      {
        id: 9,
        name: 'Aoi Tsukasa',
        tierId: 1,
        tier: {
          id: 1,
          name: 'S',
        },
        video_count: 12,
        status: 'active',
        emby_id: '[]',
        roman: '',
        aliases: '[]',
        birthday: '',
        cup: '',
        bust: '',
        waist: '',
        hip: '',
        career_from: '',
        career_to: '',
        minnano_url: '',
        avatar_path: '',
        measurements: '',
        birth_date: '',
        career_period: '',
        cup_size: '',
        height: '',
        tags: '[]',
        asset_updated_at: now,
        created_at: now,
        updated_at: now,
      },
      {
        id: 10,
        name: 'Minami Aizawa',
        tierId: 2,
        tier: {
          id: 2,
          name: 'A',
        },
        video_count: 8,
        status: 'active',
        emby_id: '[]',
        roman: '',
        aliases: '[]',
        birthday: '',
        cup: '',
        bust: '',
        waist: '',
        hip: '',
        career_from: '',
        career_to: '',
        minnano_url: '',
        avatar_path: '',
        measurements: '',
        birth_date: '',
        career_period: '',
        cup_size: '',
        height: '',
        tags: '[]',
        asset_updated_at: now,
        created_at: now,
        updated_at: now,
      },
    ] as never);
    (prismaMock.$transaction as jest.Mock).mockImplementation(async (callback: (client: PrismaClient) => unknown) =>
      callback(prismaMock as unknown as PrismaClient),
    );
    prismaMock.actress.create.mockResolvedValue({
      id: 128,
      name: 'Mikami Yua',
      tierId: 1,
      video_count: 0,
      status: 'active',
      emby_id: '[]',
      roman: '',
      aliases: '[]',
      birthday: '',
      cup: '',
      bust: '',
      waist: '',
      hip: '',
      career_from: '',
      career_to: '',
      minnano_url: '',
      avatar_path: '',
      measurements: '',
      birth_date: '',
      career_period: '',
      cup_size: '',
      height: '',
      tags: '[]',
      asset_updated_at: now,
      created_at: now,
      updated_at: now,
    });
    prismaMock.assetLog.create.mockResolvedValue({} as never);

    const { taskId } = startDesktopStorageImportTask(1, [
      'Mikami Yua',
      'Aoi Tsukasa',
      'Minami Aizawa',
      '  ',
      'mikami yua',
    ]);
    const state = await waitForTerminalTask(taskId);

    expect(state.kind).toBe('storage-import');
    expect(state.title).toBe('批量导入演员');
    expect(state.scope).toBe('S 分级');
    expect(state.progress).toBe(5);
    expect(state.total).toBe(5);
    expect(state.summary).toMatchObject({
      total: 5,
      scannedFolders: 5,
      validNames: 3,
      created: 1,
      existingCurrent: 1,
      existingOther: 1,
      skippedEmpty: 1,
      skippedDuplicate: 1,
      error: 0,
    });
    expect(state.events).toEqual([
      expect.objectContaining({
        index: 1,
        subjectName: 'Mikami Yua',
        action: '新增演员',
        result: 'created',
        subjectId: 128,
        detail: '已新增到 S 分级，演员 ID #128',
      }),
      expect.objectContaining({
        index: 3,
        subjectName: 'Minami Aizawa',
        action: '存在于其他分级',
        result: 'skipped',
        detail: '已存在于 A 分级',
      }),
    ]);
  });
});
