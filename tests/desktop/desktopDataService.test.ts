import type { Prisma, PrismaClient } from '@prisma/client';
import type { DeepMockProxy } from 'jest-mock-extended';

jest.mock('../../apps/desktop/core/prismaClient', () => {
  const { mockDeep } = jest.requireActual('jest-mock-extended') as typeof import('jest-mock-extended');
  return { prisma: mockDeep<PrismaClient>() };
});

import { prisma } from '../../apps/desktop/core/prismaClient';
import {
  createDesktopActress,
  deleteDesktopActress,
  updateDesktopActress,
  type DesktopActressInput,
} from '../../apps/desktop/core/desktopDataService';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

const tier = {
  id: 1,
  name: 'S',
  video_limit: null,
  total_video_limit: null,
  status: 'active',
  created_at: new Date('2026-06-01T00:00:00.000Z'),
  updated_at: new Date('2026-06-01T00:00:00.000Z'),
};

function actressRow(videoCount: number, assetUpdatedAt: Date, careerTo = '') {
  return {
    id: 128,
    name: 'Mikami Yua',
    tierId: 1,
    tier,
    video_count: videoCount,
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
    career_to: careerTo,
    minnano_url: '',
    avatar_path: '',
    measurements: '',
    birth_date: '',
    career_period: '',
    cup_size: '',
    height: '',
    tags: '[]',
    created_at: new Date('2026-06-01T00:00:00.000Z'),
    asset_updated_at: assetUpdatedAt,
    updated_at: new Date('2026-06-05T00:00:00.000Z'),
  };
}

function input(videoCount: number, careerTo = ''): DesktopActressInput {
  return {
    name: 'Mikami Yua',
    tierId: 1,
    video_count: videoCount,
    embyIds: [],
    aliases: [],
    avatar_path: '',
    minnano_url: '',
    career_to: careerTo,
    tags: [],
  };
}

describe('desktop data service actress asset update time', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prismaMock.$transaction as unknown as jest.Mock).mockImplementation(
      async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        callback(prismaMock as unknown as Prisma.TransactionClient),
    );
  });

  it('keeps asset update time when saving profile fields without video count changes', async () => {
    const assetUpdatedAt = new Date('2026-06-01T00:00:00.000Z');
    prismaMock.actress.findUnique.mockResolvedValue(actressRow(18, assetUpdatedAt) as never);
    prismaMock.actress.update.mockResolvedValue(actressRow(18, assetUpdatedAt) as never);

    const updated = await updateDesktopActress(128, input(18));

    expect(prismaMock.actress.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ asset_updated_at: expect.any(Date) }),
      }),
    );
    expect(prismaMock.assetLog.create).not.toHaveBeenCalled();
    expect(updated.asset_expanded_at).toBe('2026-06-01T00:00:00.000Z');
  });

  it('updates asset expansion time when video count increases', async () => {
    const oldAssetUpdatedAt = new Date('2026-06-01T00:00:00.000Z');
    const newAssetUpdatedAt = new Date('2026-06-05T00:00:00.000Z');
    prismaMock.actress.findUnique.mockResolvedValue(actressRow(18, oldAssetUpdatedAt) as never);
    prismaMock.actress.update.mockResolvedValue(actressRow(21, newAssetUpdatedAt) as never);

    const updated = await updateDesktopActress(128, input(21));

    expect(prismaMock.actress.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ asset_updated_at: expect.any(Date) }),
      }),
    );
    expect(prismaMock.assetLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ video_delta: 3 }),
      }),
    );
    expect(updated.asset_expanded_at).toBe('2026-06-05T00:00:00.000Z');
  });

  it('keeps asset expansion time when video count decreases', async () => {
    const assetExpandedAt = new Date('2026-06-01T00:00:00.000Z');
    prismaMock.actress.findUnique.mockResolvedValue(actressRow(21, assetExpandedAt) as never);
    prismaMock.actress.update.mockResolvedValue(actressRow(18, assetExpandedAt) as never);

    const updated = await updateDesktopActress(128, input(18));

    expect(prismaMock.actress.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ asset_updated_at: expect.any(Date) }),
      }),
    );
    expect(prismaMock.assetLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ video_delta: -3 }) }),
    );
    expect(updated.asset_expanded_at).toBe('2026-06-01T00:00:00.000Z');
  });

  it('creates an actress and its asset log in one transaction', async () => {
    const created = actressRow(18, new Date('2026-06-01T00:00:00.000Z'));
    prismaMock.actress.create.mockResolvedValue(created as never);
    prismaMock.assetLog.create.mockResolvedValue({} as never);

    await createDesktopActress(input(18));

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.assetLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actress_id: 128, action_type: 'CREATE', video_delta: 18 }),
    });
  });

  it('derives retired status from career end time instead of accepting a manual status', async () => {
    const created = actressRow(18, new Date('2026-06-01T00:00:00.000Z'), '2024') as never;
    prismaMock.actress.create.mockResolvedValue(created);
    prismaMock.assetLog.create.mockResolvedValue({} as never);

    const result = await createDesktopActress(input(18, '2024'));

    expect(prismaMock.actress.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ career_to: '2024', status: 'retired' }) }),
    );
    expect(result.status).toBe('retired');
  });

  it('deletes an actress and writes its asset log in one transaction', async () => {
    prismaMock.actress.findUnique.mockResolvedValue(actressRow(18, new Date()) as never);
    prismaMock.actress.delete.mockResolvedValue(actressRow(18, new Date()) as never);
    prismaMock.assetLog.create.mockResolvedValue({} as never);

    await deleteDesktopActress(128);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.assetLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actress_id: 128, action_type: 'DELETE', video_delta: -18 }),
    });
  });
});
