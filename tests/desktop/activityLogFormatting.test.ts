import {
  formatActressCreatedSummaryText,
  formatActressDeletedSummaryText,
  formatActressUpdatedSummaryText,
  formatEmbyIdSyncSummaryText,
  formatRuntimeSettingsSummaryText,
  formatStorageScanSummaryText,
  formatStorageImportSummaryText,
  formatTierCreatedSummaryText,
  formatTierDeletedSummaryText,
  formatTierUpdatedSummaryText,
  formatVideoCountSyncSummaryText,
  getActressCreatedSnapshot,
  getActressDeletedSnapshot,
  getActressUpdateChanges,
  getEmbyIdSyncEventGroups,
  getRuntimeSettingsChanges,
  getStorageScanLogEntries,
  getTierCreatedSnapshot,
  getTierDeletedSnapshot,
  getTierUpdateChanges,
  getVideoCountSyncEventGroups,
} from '../../apps/desktop/renderer/src/activityLogFormatting';

describe('activity log formatting', () => {
  it('formats storage scan summaries and folder entries for terminal log output', () => {
    expect(formatStorageScanSummaryText(2)).toBe('扫描到 2 个一级文件夹。');
    expect(formatStorageScanSummaryText(0)).toBe('没有找到一级子文件夹，或该路径不是目录。');

    expect(getStorageScanLogEntries(['三上悠亚', '奥田咲'], '/Volumes/JAV/S')).toEqual([
      { label: '实际路径', detail: '/Volumes/JAV/S' },
      { label: '三上悠亚', detail: '一级子文件夹' },
      { label: '奥田咲', detail: '一级子文件夹' },
    ]);
    expect(getStorageScanLogEntries([], '/Volumes/JAV/S')).toEqual([
      { label: '实际路径', detail: '/Volumes/JAV/S' },
      { label: '扫描结果', detail: '没有找到一级子文件夹，或该路径不是目录。' },
    ]);
  });

  it('formats storage import summaries around created and cross-tier names', () => {
    expect(
      formatStorageImportSummaryText(
        {
          total: 120,
          scannedFolders: 120,
          validNames: 118,
          created: 43,
          skippedExisting: 75,
          existingCurrent: 72,
          existingOther: 3,
          skippedEmpty: 2,
          skippedDuplicate: 0,
          error: 0,
        },
        120,
      ),
    ).toBe('扫描 120 个文件夹，识别 118 个有效演员名。当前分级已存在 72 人，新增 43 人，存在于其他分级 3 人。');
  });

  it('includes write failures only when they exist', () => {
    expect(
      formatStorageImportSummaryText(
        {
          total: 5,
          scannedFolders: 5,
          validNames: 4,
          created: 1,
          skippedExisting: 1,
          existingCurrent: 0,
          existingOther: 1,
          skippedEmpty: 1,
          skippedDuplicate: 0,
          error: 2,
        },
        5,
      ),
    ).toBe('扫描 5 个文件夹，识别 4 个有效演员名。当前分级已存在 0 人，新增 1 人，存在于其他分级 1 人，写入失败 2 人。');
  });

  it('formats video count sync summaries around changed, unchanged, skipped, and failed actresses', () => {
    expect(
      formatVideoCountSyncSummaryText(
        {
          total: 88,
          changedCount: 12,
          unchangedCount: 61,
          skipped: 13,
          error: 2,
          netDelta: 23,
        },
        88,
      ),
    ).toBe('检查 88 位演员，更新 12 人，无变化 61 人，未绑定 Emby ID 13 人，失败 2 人。影片数量净增 23 部。');
  });

  it('groups video count sync details into increased, decreased, and failed only', () => {
    const groups = getVideoCountSyncEventGroups([
      {
        id: '1',
        index: 1,
        timestamp: '2026-06-01T00:00:00.000Z',
        subjectName: 'Mikami Yua',
        action: '刷新影片数量',
        result: 'success',
        before: 18,
        after: 21,
        delta: 3,
        detail: '已同步为 21 部',
      },
      {
        id: '2',
        index: 2,
        timestamp: '2026-06-01T00:00:00.000Z',
        subjectName: 'Example A',
        action: '刷新影片数量',
        result: 'success',
        before: 22,
        after: 18,
        delta: -4,
        detail: '已同步为 18 部',
      },
      {
        id: '3',
        index: 3,
        timestamp: '2026-06-01T00:00:00.000Z',
        subjectName: 'No Change',
        action: '刷新影片数量',
        result: 'success',
        before: 12,
        after: 12,
        delta: 0,
        detail: '库存无变化',
      },
      {
        id: '4',
        index: 4,
        timestamp: '2026-06-01T00:00:00.000Z',
        subjectName: 'No Emby',
        action: '刷新影片数量',
        result: 'skipped',
        before: 8,
        after: null,
        delta: null,
        detail: '未关联 Emby ID，已跳过',
      },
      {
        id: '5',
        index: 5,
        timestamp: '2026-06-01T00:00:00.000Z',
        subjectName: 'Another Name',
        action: '刷新影片数量',
        result: 'error',
        before: 6,
        after: null,
        delta: null,
        detail: 'Emby 请求超时',
      },
    ]);

    expect(groups.increased.map((event) => event.subjectName)).toEqual(['Mikami Yua']);
    expect(groups.decreased.map((event) => event.subjectName)).toEqual(['Example A']);
    expect(groups.failed.map((event) => event.subjectName)).toEqual(['Another Name']);
  });

  it('formats Emby ID sync summaries around existing, bound, not found, and failed actresses', () => {
    expect(
      formatEmbyIdSyncSummaryText(
        {
          total: 88,
          existingEmbyId: 61,
          bound: 12,
          notFound: 13,
          error: 2,
        },
        88,
      ),
    ).toBe('检查 88 位演员，已有 Emby ID 61 人，新增绑定 12 人，Emby 未找到 13 人，失败 2 人。');
  });

  it('groups Emby ID sync details into bound, not found, and failed only', () => {
    const groups = getEmbyIdSyncEventGroups([
      {
        id: '1',
        index: 1,
        timestamp: '2026-06-01T00:00:00.000Z',
        subjectName: 'Mikami Yua',
        action: '新增绑定',
        result: 'updated',
        detail: '2 个 ID：12345, 67890',
      },
      {
        id: '2',
        index: 2,
        timestamp: '2026-06-01T00:00:00.000Z',
        subjectName: 'Existing Name',
        action: '已有 Emby ID',
        result: 'skipped',
        detail: '已有 Emby ID，已跳过',
      },
      {
        id: '3',
        index: 3,
        timestamp: '2026-06-01T00:00:00.000Z',
        subjectName: 'Example A',
        action: 'Emby 未找到',
        result: 'skipped',
        detail: '按演员名未找到匹配',
      },
      {
        id: '4',
        index: 4,
        timestamp: '2026-06-01T00:00:00.000Z',
        subjectName: 'Another Name',
        action: '同步失败',
        result: 'error',
        detail: 'Emby 请求超时',
      },
    ]);

    expect(groups.bound.map((event) => event.subjectName)).toEqual(['Mikami Yua']);
    expect(groups.notFound.map((event) => event.subjectName)).toEqual(['Example A']);
    expect(groups.failed.map((event) => event.subjectName)).toEqual(['Another Name']);
  });

  it('summarizes runtime setting changes without exposing sensitive values', () => {
    const changes = getRuntimeSettingsChanges(
      {
        dbMode: 'sqlite',
        databaseUrl: 'file:/old/jatlas.db',
        embyServerUrl: 'http://old-emby.local:8096',
        embyApiKey: 'old-secret-key',
        storageRootPath: '/Volumes/old',
        tierStoragePaths: {
          '1': '/Volumes/old/S',
        },
      },
      {
        dbMode: 'sqlite',
        databaseUrl: 'file:/new/jatlas.db',
        embyServerUrl: 'http://new-emby.local:8096',
        embyApiKey: 'new-secret-key',
        storageRootPath: '/Volumes/new',
        tierStoragePaths: {
          '1': '/Volumes/new/S',
          '2': '/Volumes/new/A',
        },
      },
    );

    expect(changes).toEqual([
      { label: '数据库文件', detail: '已更新' },
      { label: 'Emby 服务地址', detail: '已更新' },
      { label: 'Emby API Key', detail: '已更新' },
      { label: '默认存储根目录', detail: '已更新' },
      { label: '分级存储地址', detail: '已更新' },
    ]);
    expect(formatRuntimeSettingsSummaryText(changes.length)).toBe('运行配置已保存，更新 5 项。');
    expect(JSON.stringify(changes)).not.toContain('old-secret-key');
    expect(JSON.stringify(changes)).not.toContain('new-secret-key');
    expect(JSON.stringify(changes)).not.toContain('/Volumes/new/S');
  });

  it('formats runtime settings summaries when nothing changed', () => {
    expect(formatRuntimeSettingsSummaryText(0)).toBe('运行配置已保存，无配置项变化。');
  });

  it('summarizes terminal theme mode changes as visual mode updates', () => {
    const changes = getRuntimeSettingsChanges(
      {
        dbMode: 'sqlite',
        databaseUrl: 'file:/jatlas.db',
        themeMode: 'dark',
      },
      {
        dbMode: 'sqlite',
        databaseUrl: 'file:/jatlas.db',
        themeMode: 'light',
      },
    );

    expect(changes).toEqual([{ label: '视觉模式', detail: '已更新' }]);
  });

  it('summarizes actress update changes around business fields only', () => {
    const changes = getActressUpdateChanges(
      {
        id: 128,
        name: 'Mikami',
        tierId: 2,
        tierName: 'A',
        video_count: 18,
        status: 'active',
        embyIds: [],
        roman: '',
        aliases: [],
        birthday: '',
        cup: '',
        bust: '',
        waist: '',
        hip: '',
        career_from: '',
        career_to: '',
        avatar_path: '',
        minnano_url: '',
        tags: [],
        asset_expanded_at: '2026-06-01T00:00:00.000Z',
      },
      {
        id: 128,
        name: 'Mikami Yua',
        tierId: 1,
        tierName: 'S',
        video_count: 21,
        status: 'retired',
        embyIds: ['12345', '67890'],
        roman: 'Mikami Yua',
        aliases: ['のんちゃん', 'のんたん'],
        birthday: '1997年03月12日',
        cup: 'A',
        bust: '77',
        waist: '54',
        hip: '85',
        career_from: '2012',
        career_to: '',
        avatar_path: '',
        minnano_url: 'https://www.minnano-av.com/actress832690.html',
        tags: ['微乳', '低身長'],
        asset_expanded_at: '2026-06-01T00:01:00.000Z',
      },
    );

    expect(changes).toEqual([
      { label: '名称', detail: 'Mikami -> Mikami Yua' },
      { label: '分级', detail: 'A -> S' },
      { label: '演员状态', detail: '现役 -> 引退' },
      { label: '影片数量', detail: '18 -> 21  +3' },
      { label: 'Emby ID', detail: '0 个 -> 2 个' },
      { label: '英文名', detail: '未设置 -> Mikami Yua' },
      { label: '别名 / aliases', detail: '未设置 -> のんちゃん, のんたん' },
      { label: '出生日期', detail: '未设置 -> 1997年03月12日' },
      { label: '罩杯', detail: '未设置 -> A' },
      { label: '胸围 / bust', detail: '未设置 -> 77' },
      { label: '腰围 / waist', detail: '未设置 -> 54' },
      { label: '臀围 / hip', detail: '未设置 -> 85' },
      { label: '出演开始', detail: '未设置 -> 2012' },
      { label: 'Minnano 来源地址', detail: '未设置 -> https://www.minnano-av.com/actress832690.html' },
      { label: '标签', detail: '未设置 -> 微乳, 低身長' },
    ]);
    expect(formatActressUpdatedSummaryText(changes.length)).toBe('演员信息已更新，变更 15 项。');
    expect(JSON.stringify(changes)).not.toContain('12345');
  });

  it('marks Emby ID updates when the ID count stays the same', () => {
    expect(
      getActressUpdateChanges(
        {
          id: 128,
          name: 'Mikami Yua',
          tierId: 1,
          tierName: 'S',
          video_count: 21,
          status: 'active',
          embyIds: ['11111', '22222'],
          roman: '',
          aliases: [],
          birthday: '',
          cup: '',
          bust: '',
          waist: '',
          hip: '',
          career_from: '',
          career_to: '',
          avatar_path: '',
          minnano_url: '',
          tags: [],
          asset_expanded_at: '2026-06-01T00:00:00.000Z',
        },
        {
          id: 128,
          name: 'Mikami Yua',
          tierId: 1,
          tierName: 'S',
          video_count: 21,
          status: 'active',
          embyIds: ['12345', '67890'],
          roman: '',
          aliases: [],
          birthday: '',
          cup: '',
          bust: '',
          waist: '',
          hip: '',
          career_from: '',
          career_to: '',
          avatar_path: '',
          minnano_url: '',
          tags: [],
          asset_expanded_at: '2026-06-01T00:01:00.000Z',
        },
      ),
    ).toEqual([{ label: 'Emby ID', detail: '2 个 -> 2 个（内容已更新）' }]);
  });

  it('formats actress creation and deletion snapshots without expanding Emby IDs', () => {
    const row = {
      id: 128,
      name: 'Mikami Yua',
      tierId: 1,
      tierName: 'S',
      video_count: 21,
      status: 'active',
      embyIds: ['12345', '67890'],
      roman: 'Mikami Yua',
      aliases: ['のんちゃん', 'のんたん'],
      birthday: '1997年03月12日',
      cup: 'A',
      bust: '77',
      waist: '54',
      hip: '85',
      career_from: '2012',
      career_to: '',
      avatar_path: '',
      minnano_url: 'https://www.minnano-av.com/actress832690.html',
      tags: ['微乳', '低身長'],
      asset_expanded_at: '2026-06-01T00:00:00.000Z',
    };

    expect(formatActressCreatedSummaryText(row.tierName)).toBe('演员已创建，归入 S 分级。');
    expect(formatActressDeletedSummaryText()).toBe('演员已删除。');
    expect(getActressCreatedSnapshot(row)).toEqual([
      { label: '演员 ID', detail: '#128' },
      { label: '分级', detail: 'S' },
      { label: '演员状态', detail: '现役' },
      { label: '影片数量', detail: '21' },
      { label: 'Emby ID', detail: '2 个' },
      { label: '英文名', detail: 'Mikami Yua' },
      { label: '别名 / aliases', detail: 'のんちゃん, のんたん' },
      { label: '出生日期', detail: '1997年03月12日' },
      { label: '罩杯', detail: 'A' },
      { label: '胸围 / bust', detail: '77' },
      { label: '腰围 / waist', detail: '54' },
      { label: '臀围 / hip', detail: '85' },
      { label: '出演开始', detail: '2012' },
      { label: '出演结束', detail: '未设置' },
      { label: 'Minnano 来源地址', detail: 'https://www.minnano-av.com/actress832690.html' },
      { label: '标签', detail: '微乳, 低身長' },
    ]);
    expect(getActressDeletedSnapshot(row)).toEqual([
      { label: '演员 ID', detail: '#128' },
      { label: '分级', detail: 'S' },
      { label: '演员状态', detail: '现役' },
      { label: '影片数量', detail: '21' },
      { label: 'Emby ID', detail: '2 个' },
      { label: '英文名', detail: 'Mikami Yua' },
      { label: '别名 / aliases', detail: 'のんちゃん, のんたん' },
      { label: '出生日期', detail: '1997年03月12日' },
      { label: '罩杯', detail: 'A' },
      { label: '胸围 / bust', detail: '77' },
      { label: '腰围 / waist', detail: '54' },
      { label: '臀围 / hip', detail: '85' },
      { label: '出演开始', detail: '2012' },
      { label: '出演结束', detail: '未设置' },
      { label: 'Minnano 来源地址', detail: 'https://www.minnano-av.com/actress832690.html' },
      { label: '标签', detail: '微乳, 低身長' },
    ]);
    expect(JSON.stringify(getActressCreatedSnapshot(row))).not.toContain('12345');
  });

  it('summarizes tier update changes with localized status and unlimited limits', () => {
    const changes = getTierUpdateChanges(
      {
        id: 8,
        name: 'A',
        video_limit: null,
        total_video_limit: 1200,
        status: 'active',
        actressCount: 12,
      },
      {
        id: 8,
        name: 'S',
        video_limit: 40,
        total_video_limit: 480,
        status: 'retired',
        actressCount: 12,
      },
    );

    expect(changes).toEqual([
      { label: '名称', detail: 'A -> S' },
      { label: '影片上限', detail: '不限 -> 40' },
      { label: '分类总数量', detail: '1200 -> 480' },
      { label: '状态', detail: '现役 -> 引退' },
    ]);
    expect(formatTierUpdatedSummaryText(changes.length)).toBe('分级信息已更新，变更 4 项。');
  });

  it('formats tier creation and deletion snapshots', () => {
    const tier = {
      id: 8,
      name: 'S',
      video_limit: 40,
      total_video_limit: 400,
      status: 'active',
      actressCount: 0,
    };

    expect(formatTierCreatedSummaryText()).toBe('分级已创建。');
    expect(formatTierDeletedSummaryText()).toBe('分级已删除。');
    expect(getTierCreatedSnapshot(tier)).toEqual([
      { label: '分级 ID', detail: '#8' },
      { label: '影片上限', detail: '40' },
      { label: '分类总数量', detail: '400' },
      { label: '状态', detail: '现役' },
      { label: '演员数', detail: '0' },
    ]);
    expect(getTierDeletedSnapshot({ ...tier, video_limit: null, total_video_limit: null, status: 'retired', actressCount: 3 })).toEqual([
      { label: '分级 ID', detail: '#8' },
      { label: '影片上限', detail: '不限' },
      { label: '分类总数量', detail: '未设置' },
      { label: '状态', detail: '引退' },
      { label: '演员数', detail: '3' },
    ]);
  });
});
