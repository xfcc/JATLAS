import fs from 'fs';
import path from 'path';

const appSourcePath = path.resolve(__dirname, '../../apps/desktop/renderer/src/App.tsx');

describe('renderer layout contracts', () => {
  const appSource = fs.readFileSync(appSourcePath, 'utf8');

  it('does not expose derived actress status as an editor field', () => {
    expect(appSource).not.toContain('演员状态（自动）');
  });

  it('keeps storage scan path feedback out of the left operation pane', () => {
    expect(appSource).not.toContain('storageResolved');
    expect(appSource).toContain('createStorageScanActivity(result.folders, result.resolvedPath');
  });
});
