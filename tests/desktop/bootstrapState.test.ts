import { getBootstrapFailureMessage } from '../../apps/desktop/renderer/src/bootstrapState';

describe('getBootstrapFailureMessage', () => {
  it('surfaces initialization failures after desktop config exists', () => {
    expect(
      getBootstrapFailureMessage({
        configured: true,
        initialized: false,
        configPath: '/tmp/desktop-config.json',
        message: '数据库初始化失败。',
      }),
    ).toBe('数据库初始化失败。');
  });

  it('does not show a missing-config message as an error on first run', () => {
    expect(
      getBootstrapFailureMessage({
        configured: false,
        initialized: false,
        configPath: '/tmp/desktop-config.json',
        message: 'Desktop config not found. Please complete initial setup.',
      }),
    ).toBe('');
  });

  it('does not show migration-required bootstrap state as a generic failure', () => {
    expect(
      getBootstrapFailureMessage({
        configured: true,
        initialized: false,
        configPath: '/tmp/desktop-config.json',
        message: '检测到旧版本数据库，需要先升级数据库。',
        migration: {
          required: true,
          currentVersion: 0,
          targetVersion: 7,
          databasePath: '/tmp/jatlas.db',
          backupDirectory: '/tmp',
          steps: ['备份当前数据库文件'],
        },
      }),
    ).toBe('');
  });
});
