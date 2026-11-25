import type { MutableRefObject } from 'react';
import type { ActivityTerminalLine } from '../activityTerminalFormatting';

type ActivityLogPaneProps = {
  open: boolean;
  running: boolean;
  failed: boolean;
  hasActivities: boolean;
  lines: ActivityTerminalLine[];
  bodyRef: MutableRefObject<HTMLDivElement | null>;
  lastLineRef: MutableRefObject<HTMLDivElement | null>;
  onCancel?: () => void;
  retryFailureCount?: number;
  onRetry?: () => void;
  onClose: () => void;
};

export function ActivityLogPane(props: ActivityLogPaneProps) {
  return (
    <aside className={`activity-log-pane ${props.open ? 'is-open' : 'is-collapsed'} ${props.running ? 'is-running' : ''} ${props.failed ? 'has-failure' : ''}`} aria-label="操作日志">
      <header className="activity-panel-header activity-log-header">
        <div><h2>操作日志</h2><p>{props.running ? '有任务正在执行' : props.failed ? '最近操作中存在失败项' : '最近的数据库操作与批量任务'}</p></div>
        {props.open ? (
          <div className="activity-log-actions">
            {props.onCancel ? <button type="button" onClick={props.onCancel}>取消任务</button> : null}
            {props.onRetry && props.retryFailureCount ? (
              <button type="button" onClick={props.onRetry}>重试失败项 ({props.retryFailureCount})</button>
            ) : null}
            <button type="button" className="activity-log-title-toggle is-in-log-pane" onClick={props.onClose} aria-expanded="true" aria-label="折叠操作日志">⇤</button>
          </div>
        ) : null}
      </header>
      {props.open ? (
        <div className="activity-panel-body activity-log-body" ref={props.bodyRef}>
          {!props.hasActivities ? <div className="activity-empty">暂无操作日志。</div> : (
            <div className="activity-terminal-output" aria-label="终端日志输出">
              {props.lines.map((line, index) => <div className={`activity-terminal-line is-${line.kind}${line.tone ? ` tone-${line.tone}` : ''}`} key={line.id} ref={index === props.lines.length - 1 ? props.lastLineRef : undefined}>{line.text}</div>)}
            </div>
          )}
        </div>
      ) : null}
    </aside>
  );
}
