import { Prisma } from '@prisma/client';
import { actressStatusFromCareerTo } from '../shared/actressProfileRules';
import { listChildDirectoryNames, resolveStoragePath } from './storagePath';
import { prisma } from './prismaClient';

export type DesktopTier = {
  id: number;
  name: string;
  video_limit: number | null;
  total_video_limit: number | null;
  status: string;
  actressCount: number;
};

export type DesktopTierInput = {
  name: string;
  video_limit: number | null;
  total_video_limit: number | null;
  status: string;
};

export type DesktopDashboardStats = {
  m1: {
    totalCount: number;
    activeCount: number;
    retiredCount: number;
    totalAssets: number;
    overloadedAssets: number;
  };
  m2: {
    pendingEmbyLink: number;
    pendingManagement: number;
    pendingUpdate: number;
  };
  m3: Array<{
    name: string;
    id: number;
    count: number;
    total_video_count: number;
    percentage: number;
  }>;
};

export type DesktopAssetLogChartRow = {
  name: string;
  '资产入库': number;
  '资产出库': number;
  '收录扩张': number;
};

export type DesktopActress = {
  id: number;
  name: string;
  tierId: number;
  tierName: string;
  video_count: number;
  status: string;
  embyIds: string[];
  roman: string;
  aliases: string[];
  birthday: string;
  cup: string;
  bust: string;
  waist: string;
  hip: string;
  career_from: string;
  career_to: string;
  minnano_url: string;
  avatar_path: string;
  tags: string[];
  asset_expanded_at: string;
};

export type DesktopActressInput = {
  name: string;
  tierId: number;
  video_count: number;
  embyIds?: string[];
  roman?: string;
  aliases?: string[];
  birthday?: string;
  cup?: string;
  bust?: string;
  waist?: string;
  hip?: string;
  career_from?: string;
  career_to?: string;
  minnano_url?: string;
  avatar_path?: string;
  tags?: string[];
};

export type DesktopStorageBatchImportResult = {
  created: DesktopActress[];
  skippedExisting: string[];
  skippedEmpty: number;
};

function normalizeStringList(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  } catch {
    return [];
  }
}

function normalizeEmbyIds(value: string): string[] {
  return normalizeStringList(value);
}

function serializeStringList(ids: string[] | undefined): string {
  const clean = (ids ?? []).filter((v) => typeof v === 'string' && v.trim().length > 0);
  return JSON.stringify(clean);
}

function serializeEmbyIds(ids: string[] | undefined): string {
  return serializeStringList(ids);
}

export async function getDesktopTiers() {
  const tiers = await prisma.tier.findMany({
    orderBy: { id: 'asc' },
    include: { _count: { select: { actresses: true } } },
  });
  return tiers.map(
    (t): DesktopTier => ({
      id: t.id,
      name: t.name,
      video_limit: t.video_limit,
      total_video_limit: t.total_video_limit,
      status: t.status,
      actressCount: t._count.actresses,
    }),
  );
}

export async function createDesktopTier(input: DesktopTierInput) {
  const name = input.name.trim();
  if (!name) {
    throw new Error('Tier name is required');
  }
  const created = await prisma.tier.create({
    data: {
      name,
      video_limit: input.video_limit,
      total_video_limit: input.total_video_limit,
      status: input.status || 'active',
    },
  });
  return {
    id: created.id,
    name: created.name,
    video_limit: created.video_limit,
    total_video_limit: created.total_video_limit,
    status: created.status,
    actressCount: 0,
  } satisfies DesktopTier;
}

export async function updateDesktopTier(id: number, input: Partial<DesktopTierInput>) {
  const data: { name?: string; video_limit?: number | null; total_video_limit?: number | null; status?: string } = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new Error('Tier name is required');
    }
    data.name = name;
  }
  if (input.video_limit !== undefined) {
    data.video_limit = input.video_limit;
  }
  if (input.total_video_limit !== undefined) {
    data.total_video_limit = input.total_video_limit;
  }
  if (input.status !== undefined) {
    data.status = input.status;
  }
  const updated = await prisma.tier.update({
    where: { id },
    data,
    include: { _count: { select: { actresses: true } } },
  });
  return {
    id: updated.id,
    name: updated.name,
    video_limit: updated.video_limit,
    total_video_limit: updated.total_video_limit,
    status: updated.status,
    actressCount: updated._count.actresses,
  } satisfies DesktopTier;
}

export async function deleteDesktopTier(id: number) {
  try {
    await prisma.tier.delete({ where: { id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2003') {
      throw new Error('Cannot delete tier: reassign or remove actresses first.');
    }
    throw e;
  }
}

export async function getDesktopDashboardStats(): Promise<DesktopDashboardStats> {
  const actresses = await prisma.actress.findMany({
    select: {
      video_count: true,
      career_to: true,
      emby_id: true,
      asset_updated_at: true,
      tier: {
        select: {
          id: true,
          video_limit: true,
          name: true,
        },
      },
    },
  });

  const totalCount = actresses.length;
  const activeCount = actresses.filter((a) => actressStatusFromCareerTo(a.career_to) === 'active').length;
  const retiredCount = totalCount - activeCount;
  const totalAssets = actresses.reduce((sum, a) => sum + a.video_count, 0);

  const overloadedAssets = actresses
    .filter((a) => a.tier.video_limit !== null && a.video_count > a.tier.video_limit)
    .reduce((sum, a) => sum + (a.video_count - (a.tier.video_limit ?? 0)), 0);

  const pendingEmbyLink = actresses.filter((a) => normalizeEmbyIds(a.emby_id).length === 0).length;
  const pendingManagement = actresses.filter(
    (a) => a.tier.video_limit !== null && a.video_count > a.tier.video_limit,
  ).length;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const pendingUpdate = actresses.filter(
    (a) => actressStatusFromCareerTo(a.career_to) === 'active' && new Date(a.asset_updated_at) < thirtyDaysAgo,
  ).length;

  const tierDistribution = actresses.reduce(
    (acc, actress) => {
      const tierName = actress.tier.name;
      const tid = actress.tier.id;
      if (!acc[tierName]) {
        acc[tierName] = { id: tid, count: 0, total_video_count: 0 };
      }
      acc[tierName].count++;
      acc[tierName].total_video_count += actress.video_count;
      return acc;
    },
    {} as Record<string, { id: number; count: number; total_video_count: number }>,
  );

  const m3 = Object.entries(tierDistribution)
    .map(([name, data]) => ({
      name,
      id: data.id,
      count: data.count,
      total_video_count: data.total_video_count,
      percentage: totalCount > 0 ? (data.count / totalCount) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    m1: {
      totalCount,
      activeCount,
      retiredCount,
      totalAssets,
      overloadedAssets,
    },
    m2: {
      pendingEmbyLink,
      pendingManagement,
      pendingUpdate,
    },
    m3,
  };
}

export async function getDesktopAssetLogChart(): Promise<DesktopAssetLogChartRow[]> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const logs = await prisma.assetLog.findMany({
    where: { created_at: { gte: sixMonthsAgo } },
    orderBy: { created_at: 'asc' },
  });

  const data: DesktopAssetLogChartRow[] = [];
  const monthMap: { [key: string]: DesktopAssetLogChartRow } = {};

  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthName = d.toLocaleString('zh-CN', { month: 'short' });
    const year = d.getFullYear();
    const key = `${monthName} ${year}`;
    if (!monthMap[key]) {
      const newEntry = { name: monthName.replace('月', ''), '资产入库': 0, '资产出库': 0, '收录扩张': 0 };
      monthMap[key] = newEntry;
      data.push(newEntry);
    }
  }

  for (const log of logs) {
    const monthName = log.created_at.toLocaleString('zh-CN', { month: 'short' });
    const year = log.created_at.getFullYear();
    const key = `${monthName} ${year}`;
    const entry = monthMap[key];
    if (!entry) continue;

    if (log.action_type === 'CREATE') {
      entry['收录扩张'] += 1;
    } else if (log.action_type === 'UPDATE') {
      if (log.video_delta > 0) {
        entry['资产入库'] += log.video_delta;
      } else {
        entry['资产出库'] += Math.abs(log.video_delta);
      }
    }
  }

  return data;
}

export async function getDesktopActresses(query?: string) {
  const where = query?.trim()
    ? {
        name: {
          contains: query.trim(),
        },
      }
    : {};

  const rows = await prisma.actress.findMany({
    where,
    include: { tier: true },
    orderBy: { id: 'asc' },
  });

  return rows.map(
    (row): DesktopActress => ({
      id: row.id,
      name: row.name,
      tierId: row.tierId,
      tierName: row.tier.name,
      video_count: row.video_count,
      status: actressStatusFromCareerTo(row.career_to),
      embyIds: normalizeEmbyIds(row.emby_id),
      roman: row.roman,
      aliases: normalizeStringList(row.aliases),
      birthday: row.birthday || row.birth_date,
      cup: row.cup || row.cup_size,
      bust: row.bust,
      waist: row.waist,
      hip: row.hip,
      career_from: row.career_from,
      career_to: row.career_to,
      minnano_url: row.minnano_url,
      avatar_path: row.avatar_path,
      tags: normalizeStringList(row.tags),
      asset_expanded_at: row.asset_updated_at.toISOString(),
    }),
  );
}

export async function createDesktopActress(input: DesktopActressInput) {
  const careerTo = input.career_to?.trim() ?? '';
  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.actress.create({
      data: {
        name: input.name.trim(),
        tierId: input.tierId,
        video_count: input.video_count,
        status: actressStatusFromCareerTo(careerTo),
        emby_id: serializeEmbyIds(input.embyIds),
        roman: input.roman?.trim() ?? '',
        aliases: serializeStringList(input.aliases),
        birthday: input.birthday?.trim() ?? '',
        cup: input.cup?.trim() ?? '',
        bust: input.bust?.trim() ?? '',
        waist: input.waist?.trim() ?? '',
        hip: input.hip?.trim() ?? '',
        career_from: input.career_from?.trim() ?? '',
        career_to: careerTo,
        minnano_url: input.minnano_url?.trim() ?? '',
        avatar_path: input.avatar_path?.trim() ?? '',
        tags: serializeStringList(input.tags),
      },
      include: { tier: true },
    });
    await tx.assetLog.create({
      data: {
        actress_id: row.id,
        actress_name: row.name,
        action_type: 'CREATE',
        video_delta: row.video_count,
      },
    });
    return row;
  });

  return {
    id: created.id,
    name: created.name,
    tierId: created.tierId,
    tierName: created.tier.name,
    video_count: created.video_count,
    status: actressStatusFromCareerTo(created.career_to),
    embyIds: normalizeEmbyIds(created.emby_id),
    roman: created.roman,
    aliases: normalizeStringList(created.aliases),
    birthday: created.birthday,
    cup: created.cup,
    bust: created.bust,
    waist: created.waist,
    hip: created.hip,
    career_from: created.career_from,
    career_to: created.career_to,
    minnano_url: created.minnano_url,
    avatar_path: created.avatar_path,
    tags: normalizeStringList(created.tags),
    asset_expanded_at: created.asset_updated_at.toISOString(),
  } as DesktopActress;
}

export async function updateDesktopActress(id: number, input: DesktopActressInput) {
  const careerTo = input.career_to?.trim() ?? '';
  const updated = await prisma.$transaction(async (tx) => {
    const before = await tx.actress.findUnique({ where: { id } });
    if (!before) {
      throw new Error('Actress not found');
    }

    const videoCountIncreased = input.video_count > before.video_count;
    const row = await tx.actress.update({
      where: { id },
      data: {
        name: input.name.trim(),
        tierId: input.tierId,
        video_count: input.video_count,
        status: actressStatusFromCareerTo(careerTo),
        emby_id: serializeEmbyIds(input.embyIds),
        roman: input.roman?.trim() ?? '',
        aliases: serializeStringList(input.aliases),
        birthday: input.birthday?.trim() ?? '',
        cup: input.cup?.trim() ?? '',
        bust: input.bust?.trim() ?? '',
        waist: input.waist?.trim() ?? '',
        hip: input.hip?.trim() ?? '',
        career_from: input.career_from?.trim() ?? '',
        career_to: careerTo,
        minnano_url: input.minnano_url?.trim() ?? '',
        avatar_path: input.avatar_path?.trim() ?? '',
        tags: serializeStringList(input.tags),
        ...(videoCountIncreased ? { asset_updated_at: new Date() } : {}),
      },
      include: { tier: true },
    });

    const delta = row.video_count - before.video_count;
    if (delta !== 0) {
      await tx.assetLog.create({
        data: {
          actress_id: id,
          actress_name: row.name,
          action_type: 'UPDATE',
          video_delta: delta,
        },
      });
    }
    return row;
  });

  return {
    id: updated.id,
    name: updated.name,
    tierId: updated.tierId,
    tierName: updated.tier.name,
    video_count: updated.video_count,
    status: actressStatusFromCareerTo(updated.career_to),
    embyIds: normalizeEmbyIds(updated.emby_id),
    roman: updated.roman,
    aliases: normalizeStringList(updated.aliases),
    birthday: updated.birthday,
    cup: updated.cup,
    bust: updated.bust,
    waist: updated.waist,
    hip: updated.hip,
    career_from: updated.career_from,
    career_to: updated.career_to,
    minnano_url: updated.minnano_url,
    avatar_path: updated.avatar_path,
    tags: normalizeStringList(updated.tags),
    asset_expanded_at: updated.asset_updated_at.toISOString(),
  } as DesktopActress;
}

export async function scanDesktopTierStorage(tierId: number, rawPath: string) {
  const tier = await prisma.tier.findUnique({ where: { id: tierId }, select: { id: true } });
  if (!tier) {
    throw new Error('Tier not found');
  }
  const resolvedPath = resolveStoragePath(rawPath);
  const folders = await listChildDirectoryNames(resolvedPath);
  return { resolvedPath, folders };
}

export async function importDesktopTierFoldersAsActresses(
  tierId: number,
  folderNames: string[],
): Promise<DesktopStorageBatchImportResult> {
  const tier = await prisma.tier.findUnique({ where: { id: tierId }, select: { id: true, name: true } });
  if (!tier) {
    throw new Error('Tier not found');
  }

  const trimmed = folderNames.map((name) => name.trim());
  const nonEmpty = trimmed.filter((name) => name.length > 0);
  const uniqueByNormalized = new Map<string, string>();
  for (const name of nonEmpty) {
    const normalized = name.normalize('NFC').toLocaleLowerCase();
    if (!uniqueByNormalized.has(normalized)) {
      uniqueByNormalized.set(normalized, name);
    }
  }

  const candidateNames = Array.from(uniqueByNormalized.values());
  if (candidateNames.length === 0) {
    return { created: [], skippedExisting: [], skippedEmpty: folderNames.length };
  }

  const existing = await prisma.actress.findMany({
    where: {
      name: {
        in: candidateNames,
      },
    },
    select: { name: true },
  });
  const existingNameSet = new Set(existing.map((row) => row.name.normalize('NFC').toLocaleLowerCase()));

  const toCreateNames: string[] = [];
  const skippedExisting: string[] = [];
  for (const candidate of candidateNames) {
    const normalized = candidate.normalize('NFC').toLocaleLowerCase();
    if (existingNameSet.has(normalized)) {
      skippedExisting.push(candidate);
      continue;
    }
    toCreateNames.push(candidate);
  }

  if (toCreateNames.length === 0) {
    return {
      created: [],
      skippedExisting: skippedExisting.sort((a, b) => a.localeCompare(b, 'ja')),
      skippedEmpty: folderNames.length - nonEmpty.length,
    };
  }

  const createdRows = await prisma.$transaction(async (tx) => {
    const rows = await Promise.all(
      toCreateNames.map((name) =>
        tx.actress.create({
          data: {
            name,
            tierId,
            video_count: 0,
            status: 'active',
            emby_id: serializeEmbyIds([]),
            roman: '',
            aliases: serializeStringList([]),
            birthday: '',
            cup: '',
            bust: '',
            waist: '',
            hip: '',
            career_from: '',
            career_to: '',
            minnano_url: '',
            avatar_path: '',
            tags: serializeStringList([]),
          },
          include: { tier: true },
        }),
      ),
    );
    await tx.assetLog.createMany({
      data: rows.map((row) => ({
        actress_id: row.id,
        actress_name: row.name,
        action_type: 'CREATE',
        video_delta: 0,
      })),
    });
    return rows;
  });

  const created = createdRows.map(
    (row): DesktopActress => ({
      id: row.id,
      name: row.name,
      tierId: row.tierId,
      tierName: row.tier.name,
      video_count: row.video_count,
      status: actressStatusFromCareerTo(row.career_to),
      embyIds: normalizeEmbyIds(row.emby_id),
      roman: row.roman,
      aliases: normalizeStringList(row.aliases),
      birthday: row.birthday || row.birth_date,
      cup: row.cup || row.cup_size,
      bust: row.bust,
      waist: row.waist,
      hip: row.hip,
      career_from: row.career_from,
      career_to: row.career_to,
      minnano_url: row.minnano_url,
      avatar_path: row.avatar_path,
      tags: normalizeStringList(row.tags),
      asset_expanded_at: row.asset_updated_at.toISOString(),
    }),
  );

  return {
    created,
    skippedExisting: skippedExisting.sort((a, b) => a.localeCompare(b, 'ja')),
    skippedEmpty: folderNames.length - nonEmpty.length,
  };
}

export async function deleteDesktopActress(id: number) {
  await prisma.$transaction(async (tx) => {
    const found = await tx.actress.findUnique({ where: { id } });
    if (!found) {
      throw new Error('Actress not found');
    }

    await tx.actress.delete({ where: { id } });
    await tx.assetLog.create({
      data: {
        actress_id: found.id,
        actress_name: found.name,
        action_type: 'DELETE',
        video_delta: -found.video_count,
      },
    });
  });
}
