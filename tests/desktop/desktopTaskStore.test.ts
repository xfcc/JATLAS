import {
  createDesktopTaskId,
  desktopTasks,
  getDesktopTaskState,
  isDesktopTaskTerminal,
  setDesktopTaskState,
  taskPhaseFromStatus,
} from '../../apps/desktop/core/desktopTaskStore';

describe('desktop task store', () => {
  beforeEach(() => desktopTasks.clear());
  afterEach(() => desktopTasks.clear());

  it('uses explicit phases for legacy status details', () => {
    expect(taskPhaseFromStatus('starting')).toBe('queued');
    expect(taskPhaseFromStatus('processing (2 successful)')).toBe('running');
    expect(taskPhaseFromStatus('completed:cancelled')).toBe('cancelled');
    expect(taskPhaseFromStatus('completed (2 successful)')).toBe('completed');
    expect(taskPhaseFromStatus('error:tier_not_found')).toBe('failed');

    const state = setDesktopTaskState('failed-task', { progress: 0, total: 1, status: 'error:network' });
    expect(state.phase).toBe('failed');
    expect(isDesktopTaskTerminal(state)).toBe(true);
  });

  it('uses collision-resistant task ids', () => {
    expect(createDesktopTaskId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('keeps at most one hundred finished tasks', () => {
    for (let index = 0; index < 105; index += 1) {
      setDesktopTaskState(`task-${index}`, { progress: 1, total: 1, status: 'completed' });
    }

    expect(desktopTasks.size).toBe(100);
    expect(getDesktopTaskState('task-0')).toBeNull();
    expect(getDesktopTaskState('task-104')?.phase).toBe('completed');
  });
});
