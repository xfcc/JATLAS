import type { DesktopTier } from '../../../core/desktopDataService';
import { desktopThemeOptions, normalizeDesktopThemeMode, type DesktopThemeMode } from '../terminalTheme';

type SettingsPageProps = {
  databasePath: string;
  themeMode: DesktopThemeMode;
  embyServerUrl: string;
  embyApiKey: string;
  saving: boolean;
  submitting: boolean;
  tiers: DesktopTier[];
  tierStoragePaths: Record<string, string>;
  onSelectDatabase: () => void;
  onThemeChange: (mode: DesktopThemeMode) => void;
  onEmbyServerUrlChange: (value: string) => void;
  onEmbyApiKeyChange: (value: string) => void;
  onSave: () => void;
  onCreateTier: () => void;
  onEditTier: (tier: DesktopTier) => void;
  onDeleteTier: (tierId: number) => void;
};

export function SettingsPage(props: SettingsPageProps) {
  return (
    <>
      <section className="settings-section">
        <h2>系统设置</h2>
        <div className="settings-form">
          <label>数据库文件<div className="settings-path-row"><input readOnly value={props.databasePath} /><button type="button" onClick={props.onSelectDatabase}>重新选择</button></div></label>
          <label>视觉模式<select value={props.themeMode} onChange={(event) => props.onThemeChange(normalizeDesktopThemeMode(event.target.value))} disabled={props.saving}>{desktopThemeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label>Emby 服务地址<input value={props.embyServerUrl} onChange={(event) => props.onEmbyServerUrlChange(event.target.value)} placeholder="例如 http://emby.local:8096" /></label>
          <label>Emby API Key<input value={props.embyApiKey} onChange={(event) => props.onEmbyApiKeyChange(event.target.value)} type="password" placeholder="用于演员 ID 与影片数量同步" /></label>
          <div className="settings-actions"><button type="button" onClick={props.onSave} disabled={props.saving} aria-busy={props.saving}>保存设置</button></div>
        </div>
      </section>

      <div className="section-heading-row"><h2>分类管理</h2><button type="button" onClick={props.onCreateTier}>新建分类</button></div>
      <section className="settings-table-wrap">
        <table className="settings-table">
          <thead><tr><th>ID</th><th>名称</th><th>单人上限</th><th>分类上限</th><th>演员数</th><th>存储目录</th><th>操作</th></tr></thead>
          <tbody>
            {props.tiers.map((tier) => (
              <tr key={tier.id}>
                <td>{tier.id}</td><td>{tier.name}</td><td>{tier.video_limit ?? '不限'}</td><td>{tier.total_video_limit ?? '未设置'}</td><td>{tier.actressCount}</td><td>{props.tierStoragePaths[String(tier.id)] || '未设置'}</td>
                <td><div className="table-actions"><button type="button" aria-label={`编辑分类 ${tier.name}`} onClick={() => props.onEditTier(tier)}>编辑</button><button type="button" aria-label={`删除分类 ${tier.name}`} onClick={() => props.onDeleteTier(tier.id)} disabled={props.submitting}>删除</button></div></td>
              </tr>
            ))}
            {props.tiers.length === 0 ? <tr><td colSpan={7}>还没有分类。</td></tr> : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
