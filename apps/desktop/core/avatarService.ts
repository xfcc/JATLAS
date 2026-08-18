import fs from 'fs/promises';
import path from 'path';

const ALLOWED_AVATAR_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'actress';
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('webp')) return '.webp';
  return '.jpg';
}

function extensionFromPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_AVATAR_EXTENSIONS.has(ext)) {
    throw new Error('头像文件必须是 jpg、png 或 webp 图片。');
  }
  return ext === '.jpeg' ? '.jpg' : ext;
}

async function ensureAvatarDirectory(userDataPath: string) {
  const dir = path.join(userDataPath, 'avatars');
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function avatarFilePath(userDataPath: string, actressName: string, ext: string) {
  return path.join(userDataPath, 'avatars', `${slugify(actressName)}-${Date.now()}${ext}`);
}

export async function copyAvatarToUserData(userDataPath: string, sourcePath: string, actressName: string) {
  const ext = extensionFromPath(sourcePath);
  await ensureAvatarDirectory(userDataPath);
  const destination = avatarFilePath(userDataPath, actressName, ext);
  await fs.copyFile(sourcePath, destination);
  return destination;
}

export async function downloadAvatarToUserData(userDataPath: string, avatarUrl: string, actressName: string) {
  const parsed = new URL(avatarUrl);
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('头像地址必须是 http 或 https。');
  }

  const response = await fetch(parsed.toString());
  if (!response.ok) {
    throw new Error(`头像下载失败：${response.status} ${response.statusText}`.trim());
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType && !contentType.startsWith('image/')) {
    throw new Error('头像地址没有返回图片内容。');
  }

  await ensureAvatarDirectory(userDataPath);
  const ext = extensionFromContentType(contentType || path.extname(parsed.pathname));
  const destination = avatarFilePath(userDataPath, actressName, ext);
  await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
  return destination;
}
