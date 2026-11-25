import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { copyAvatarToUserData, downloadAvatarToUserData } from '../../apps/desktop/core/avatarService';

describe('avatar service', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jatlas-avatar-service-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('copies a selected local image into the app avatar directory', async () => {
    const sourcePath = path.join(tempDir, 'source.jpg');
    await fs.writeFile(sourcePath, Buffer.from('image-bytes'));

    const avatarPath = await copyAvatarToUserData(tempDir, sourcePath, 'Mikami Yua');

    expect(avatarPath).toMatch(/avatars[/\\]mikami-yua-\d+\.jpg$/);
    await expect(fs.readFile(avatarPath, 'utf8')).resolves.toBe('image-bytes');
  });

  it('downloads a Minnano avatar image into the app avatar directory', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'image/jpeg' }),
      arrayBuffer: async () => Buffer.from('remote-image'),
    } as unknown as Response);

    const avatarPath = await downloadAvatarToUserData(tempDir, 'https://www.minnano-av.com/img/actress/832690.jpg', '奥田咲');

    expect(avatarPath).toMatch(/avatars[/\\].+-\d+\.jpg$/);
    await expect(fs.readFile(avatarPath, 'utf8')).resolves.toBe('remote-image');
  });
});
