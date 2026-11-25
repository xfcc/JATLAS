export type ActivityIndicatorTone = 'idle' | 'running' | 'updated' | 'failed' | 'failed-unread';

export type ActivityIndicatorInput = {
  hasRunningActivity: boolean;
  hasFailedActivity: boolean;
  hasUnreadActivity: boolean;
};

export type ActivityIndicatorState = {
  ariaLabel: string;
  classNames: string[];
  title: string;
  tone: ActivityIndicatorTone;
};

export function getActivityIndicatorState(input: ActivityIndicatorInput): ActivityIndicatorState {
  const classNames = ['activity-icon-button'];
  if (input.hasRunningActivity) {
    classNames.push('is-running');
  }
  if (input.hasFailedActivity) {
    classNames.push('has-failure');
  }
  if (input.hasUnreadActivity) {
    classNames.push('has-unread');
  }

  if (input.hasRunningActivity) {
    return {
      ariaLabel: '操作动态：有任务正在执行',
      classNames,
      title: '有任务正在执行，打开操作动态查看过程',
      tone: 'running',
    };
  }

  if (input.hasFailedActivity && input.hasUnreadActivity) {
    return {
      ariaLabel: '操作动态：有失败更新',
      classNames,
      title: '操作动态有失败更新',
      tone: 'failed-unread',
    };
  }

  if (input.hasFailedActivity) {
    return {
      ariaLabel: '操作动态：有失败记录',
      classNames,
      title: '操作动态有失败记录',
      tone: 'failed',
    };
  }

  if (input.hasUnreadActivity) {
    return {
      ariaLabel: '操作动态：有新更新',
      classNames,
      title: '操作动态有新更新',
      tone: 'updated',
    };
  }

  return {
    ariaLabel: '操作动态',
    classNames,
    title: '操作动态',
    tone: 'idle',
  };
}
