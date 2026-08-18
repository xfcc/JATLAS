interface EmbyPerson {
  Id: string;
}

interface EmbyItemCountResponse {
  TotalRecordCount?: number;
}

interface EmbyPersonSearchResponse {
  Items?: unknown;
}

const EMBY_REQUEST_TIMEOUT_MS = 15_000;

async function fetchEmby(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMBY_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Emby 请求超时，请检查服务地址和网络连接。');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function isEmbyPerson(value: unknown): value is EmbyPerson {
  return (
    value !== null &&
    typeof value === 'object' &&
    'Id' in value &&
    typeof (value as { Id?: unknown }).Id === 'string'
  );
}

export async function fetchActressCountFromEmby(embyPersonIds: string[]): Promise<number> {
  if (embyPersonIds.length === 0) {
    return 0;
  }

  const baseUrl = process.env.EMBY_SERVER_URL?.replace(/\/$/, '');
  const apiKey = process.env.EMBY_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('Emby server URL or API key is not configured in environment variables.');
  }

  const counts = await Promise.all(
    embyPersonIds.map(async (personId) => {
      const params = new URLSearchParams({
        Recursive: 'true',
        IncludeItemTypes: 'Movie,Video',
        PersonIds: personId,
        api_key: apiKey,
      });
      const url = `${baseUrl}/emby/Items?${params.toString()}`;
      const response = await fetchEmby(url);
      if (!response.ok) {
        throw new Error(`Emby 影片数量请求失败：${response.status} ${response.statusText}`.trim());
      }
      const data = (await response.json()) as EmbyItemCountResponse;
      if (typeof data.TotalRecordCount !== 'number' || data.TotalRecordCount < 0) {
        throw new Error(`Emby 影片数量响应无效：${personId}`);
      }
      return data.TotalRecordCount;
    }),
  );

  return counts.reduce((total: number, count: number) => total + count, 0);
}

export async function fetchEmbyIdsByName(actressName: string): Promise<string[]> {
  const baseUrl = process.env.EMBY_SERVER_URL?.replace(/\/$/, '');
  const apiKey = process.env.EMBY_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error('Emby server URL or API key is not configured in environment variables.');
  }

  const term = actressName.trim();
  if (!term) {
    return [];
  }

  const params = new URLSearchParams({
    searchTerm: term,
    api_key: apiKey,
  });

  const url = `${baseUrl}/emby/Persons?${params.toString()}`;

  const response = await fetchEmby(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch data from Emby: ${response.status} ${response.statusText}`.trim());
  }

  const data = (await response.json()) as EmbyPersonSearchResponse;
  if (data.Items && Array.isArray(data.Items)) {
    return data.Items.filter(isEmbyPerson).map((person) => person.Id);
  }
  return [];
}
