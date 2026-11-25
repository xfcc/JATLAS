import { terminalProgressBar, terminalStatusCode } from '../../apps/desktop/renderer/src/terminalDesign';

describe('terminal design helpers', () => {
  it('formats business states as terminal status codes', () => {
    expect(terminalStatusCode('ok')).toBe('[正常]');
    expect(terminalStatusCode('running')).toBe('[运行]');
    expect(terminalStatusCode('error')).toBe('[错误]');
    expect(terminalStatusCode('muted')).toBe('[--]');
  });

  it('renders progress as a fixed-width character bar', () => {
    expect(terminalProgressBar(3, 6, 10)).toBe('[|||||.....]');
    expect(terminalProgressBar(10, 5, 8)).toBe('[||||||||]');
    expect(terminalProgressBar(0, 0, 6)).toBe('[......]');
  });
});
