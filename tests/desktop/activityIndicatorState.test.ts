import { getActivityIndicatorState } from '../../apps/desktop/renderer/src/activityIndicatorState';

describe('getActivityIndicatorState', () => {
  it('prioritizes running activity with an animated running cue', () => {
    expect(
      getActivityIndicatorState({
        hasRunningActivity: true,
        hasFailedActivity: false,
        hasUnreadActivity: true,
      }),
    ).toEqual({
      ariaLabel: '操作动态：有任务正在执行',
      classNames: ['activity-icon-button', 'is-running', 'has-unread'],
      title: '有任务正在执行，打开操作动态查看过程',
      tone: 'running',
    });
  });

  it('shows a completed unread cue when new successful activity is available', () => {
    expect(
      getActivityIndicatorState({
        hasRunningActivity: false,
        hasFailedActivity: false,
        hasUnreadActivity: true,
      }),
    ).toEqual({
      ariaLabel: '操作动态：有新更新',
      classNames: ['activity-icon-button', 'has-unread'],
      title: '操作动态有新更新',
      tone: 'updated',
    });
  });

  it('keeps failure visible and marks it as unread when needed', () => {
    expect(
      getActivityIndicatorState({
        hasRunningActivity: false,
        hasFailedActivity: true,
        hasUnreadActivity: true,
      }),
    ).toEqual({
      ariaLabel: '操作动态：有失败更新',
      classNames: ['activity-icon-button', 'has-failure', 'has-unread'],
      title: '操作动态有失败更新',
      tone: 'failed-unread',
    });
  });
});
