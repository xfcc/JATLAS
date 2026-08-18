export type MinnanoActressProfile = {
  sourceUrl: string;
  avatarUrl: string;
  avatarPath?: string;
  matchedName: string;
  roman: string;
  aliases: string[];
  birthday: string;
  cup: string;
  bust: string;
  waist: string;
  hip: string;
  career_from: string;
  career_to: string;
  tags: string[];
};

const MINNANO_BASE_URL = 'https://www.minnano-av.com';
const MINNANO_HEADERS = {
  'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8,zh-CN;q=0.7',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
};

function decodeHtml(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanText(value: string) {
  return decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function firstMatch(html: string, pattern: RegExp) {
  return pattern.exec(html)?.[1]?.trim() ?? '';
}

function normalizeMinnanoProfileUrl(rawUrl: string) {
  const value = rawUrl.trim();
  if (!value) return '';
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Minnano 页面地址格式不正确。');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Minnano 页面地址必须是 http 或 https。');
  }
  if (parsed.hostname !== 'www.minnano-av.com' && parsed.hostname !== 'minnano-av.com') {
    throw new Error('Minnano 页面地址必须来自 minnano-av.com。');
  }
  if (!/^\/actress\d+\.html$/i.test(parsed.pathname)) {
    throw new Error('Minnano 页面地址必须是女优详情页，例如 https://www.minnano-av.com/actress832690.html。');
  }
  parsed.protocol = 'https:';
  parsed.hostname = 'www.minnano-av.com';
  parsed.hash = '';
  return parsed.toString();
}

function isRomanName(value: string) {
  return /^[A-Za-z][A-Za-z\s.'-]*$/.test(value.trim());
}

function formatIsoDateAsJapanese(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return value.trim();
  return `${match[1]}年${match[2]}月${match[3]}日`;
}

function parseJsonLd(html: string): Partial<MinnanoActressProfile> {
  const raw = firstMatch(html, /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as {
      name?: unknown;
      additionalName?: unknown;
      url?: unknown;
      birthDate?: unknown;
    };
    return {
      matchedName: typeof parsed.name === 'string' ? parsed.name : '',
      roman: typeof parsed.additionalName === 'string' ? parsed.additionalName : '',
      birthday: typeof parsed.birthDate === 'string' ? formatIsoDateAsJapanese(parsed.birthDate) : '',
      sourceUrl: typeof parsed.url === 'string' ? parsed.url : '',
    };
  } catch {
    return {};
  }
}

function normalizeMinnanoAssetUrl(value: string) {
  const raw = decodeHtml(value).trim();
  if (!raw) return '';
  try {
    return new URL(raw, MINNANO_BASE_URL).toString();
  } catch {
    return '';
  }
}

function parseAvatarUrl(html: string) {
  const ogImage = firstMatch(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImage) return normalizeMinnanoAssetUrl(ogImage);

  const actProfileImage = firstMatch(
    html,
    /<div[^>]+class=["'][^"']*act-profile[^"']*["'][\s\S]*?<img[^>]+src=["']([^"']+)["']/i,
  );
  if (actProfileImage) return normalizeMinnanoAssetUrl(actProfileImage);

  const firstActressImage = firstMatch(html, /<img[^>]+src=["']([^"']*(?:actress|photo|profile)[^"']*)["']/i);
  return normalizeMinnanoAssetUrl(firstActressImage);
}

function parseTitleNames(html: string) {
  const matchedName = cleanText(firstMatch(html, /<h1>\s*([^<]+?)\s*<span>/i));
  const subtitle = cleanText(firstMatch(html, /<h1>[\s\S]*?<span>([\s\S]*?)<\/span>/i));
  const subtitleParts = subtitle.split('/').map((part) => part.trim()).filter(Boolean);
  const roman = subtitleParts.find(isRomanName) ?? '';
  return { matchedName, roman };
}

function parseProfileValue(html: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const raw = firstMatch(html, new RegExp(`<span>\\s*${escaped}\\s*<\\/span>\\s*<p>([\\s\\S]*?)<\\/p>`, 'i'));
  return cleanText(raw);
}

function parseBirthday(value: string) {
  const match = /(\d{4}年\d{2}月\d{2}日)/.exec(value);
  return match?.[1] ?? value;
}

function parseSize(value: string) {
  const bust = /B\s*(\d+)/i.exec(value)?.[1] ?? '';
  const waist = /W\s*(\d+)/i.exec(value)?.[1] ?? '';
  const hip = /H\s*(\d+)/i.exec(value)?.[1] ?? '';
  const cup = /[（(]\s*([A-Z]+)\s*カップ\s*[）)]/i.exec(value)?.[1] ?? '';
  return { bust, waist, hip, cup };
}

function parseCareerPeriod(value: string) {
  const parts = value
    .replace(/～/g, '-')
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    career_from: parts[0] ?? '',
    career_to: parts[1] ?? '',
  };
}

function parseTags(html: string) {
  const raw = firstMatch(html, /<span>\s*タグ\s*<\/span>\s*<div class=["']tagarea["']>([\s\S]*?)<\/td>/i);
  const values = Array.from(raw.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)).flatMap((match) =>
    cleanText(match[1]).split(/[，,]/).map((value) => value.trim()),
  );
  return unique(values);
}

function parseAliases(html: string) {
  const profileValue = parseProfileValue(html, '別名');
  if (profileValue) {
    return unique(profileValue.split(/[，,、/]/).map((value) => value.trim()));
  }

  const raw = firstMatch(html, /<span>\s*別名\s*<\/span>\s*<div[^>]*>([\s\S]*?)<\/td>/i);
  const values = Array.from(raw.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)).flatMap((match) =>
    cleanText(match[1]).split(/[，,、/]/).map((value) => value.trim()),
  );
  return unique(values);
}

export function parseMinnanoActressProfileHtml(html: string, fallbackUrl: string): MinnanoActressProfile {
  const jsonLd = parseJsonLd(html);
  const titleNames = parseTitleNames(html);
  const size = parseSize(parseProfileValue(html, 'サイズ'));
  const career = parseCareerPeriod(parseProfileValue(html, 'AV出演期間'));
  const canonical = firstMatch(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);

  const profile = {
    sourceUrl: jsonLd.sourceUrl || canonical || fallbackUrl,
    avatarUrl: parseAvatarUrl(html),
    matchedName: titleNames.matchedName || jsonLd.matchedName || '',
    roman: titleNames.roman || jsonLd.roman || '',
    aliases: parseAliases(html),
    birthday: parseBirthday(parseProfileValue(html, '生年月日')) || jsonLd.birthday || '',
    cup: size.cup,
    bust: size.bust,
    waist: size.waist,
    hip: size.hip,
    career_from: career.career_from,
    career_to: career.career_to,
    tags: parseTags(html),
  };

  if (!profile.matchedName && !profile.roman && profile.tags.length === 0) {
    throw new Error('Minnano 页面中没有找到可用的女优情报。');
  }
  return profile;
}

async function fetchMinnanoProfilePage(url: string) {
  const response = await fetch(url, { headers: MINNANO_HEADERS });
  if (!response.ok) {
    throw new Error(`Minnano 详情请求失败：${response.status} ${response.statusText}`.trim());
  }
  return parseMinnanoActressProfileHtml(await response.text(), response.url || url);
}

export async function fetchMinnanoActressProfile(name: string, sourceUrl?: string): Promise<MinnanoActressProfile> {
  const query = name.trim();
  if (!query) {
    throw new Error('请先填写演员名称。');
  }

  const directUrl = sourceUrl ? normalizeMinnanoProfileUrl(sourceUrl) : '';
  if (directUrl) {
    return fetchMinnanoProfilePage(directUrl);
  }

  const url = `${MINNANO_BASE_URL}/search_result.php?search_scope=actress&search_word=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: MINNANO_HEADERS });

  if (!response.ok) {
    throw new Error(`Minnano 请求失败：${response.status} ${response.statusText}`.trim());
  }

  const html = await response.text();
  if (/<div[^>]+class=["']act-profile["']/i.test(html)) {
    return parseMinnanoActressProfileHtml(html, response.url || url);
  }

  const firstActressPath = firstMatch(html, /href=["']\/?(actress\d+\.html)["']/i);
  if (!firstActressPath) {
    return parseMinnanoActressProfileHtml(html, response.url || url);
  }

  const profileUrl = `${MINNANO_BASE_URL}/${firstActressPath}`;
  return fetchMinnanoProfilePage(profileUrl);
}
