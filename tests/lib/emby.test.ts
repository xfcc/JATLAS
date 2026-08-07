import { fetchActressCountFromEmby, fetchEmbyIdsByName } from '../../apps/desktop/core/embyApi';

describe('Emby Fetcher', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    process.env.EMBY_SERVER_URL = 'http://fake-emby-server:8096';
    process.env.EMBY_API_KEY = 'fake-api-key';
  });

  it('should fetch and return actress count from Emby', async () => {
    const embyPersonId = '12345';
    const mockApiResponse = {
      Items: [],
      TotalRecordCount: 42,
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });

    const count = await fetchActressCountFromEmby([embyPersonId]);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/emby/Items?Recursive=true&IncludeItemTypes=Movie%2CVideo&PersonIds=${embyPersonId}`),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(count).toBe(42);
  });

  it('keeps a real zero count distinct from a request failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ TotalRecordCount: 0 }),
    });

    await expect(fetchActressCountFromEmby(['12345'])).resolves.toBe(0);
  });

  it('should reject if the fetch fails', async () => {
    const embyPersonId = '12345';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(fetchActressCountFromEmby([embyPersonId])).rejects.toThrow('Emby 影片数量请求失败：500 Internal Server Error');
  });

  it('should reject if the response is not valid JSON', async () => {
    const embyPersonId = '12345';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => { throw new Error('Invalid JSON'); },
    });

    await expect(fetchActressCountFromEmby([embyPersonId])).rejects.toThrow('Invalid JSON');
  });

  it('rejects the whole count when any linked Emby person request fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ TotalRecordCount: 12 }) })
      .mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Unavailable' });

    await expect(fetchActressCountFromEmby(['p1', 'p2'])).rejects.toThrow('Emby 影片数量请求失败：503 Unavailable');
  });
});

describe('fetchEmbyIdsByName', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    process.env.EMBY_SERVER_URL = 'http://fake-emby-server:8096';
    process.env.EMBY_API_KEY = 'fake-api-key';
  });

  it('uses /emby/Persons when the server responds 200', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ Items: [{ Id: 'p1' }, { Id: 'p2' }] }),
    });

    const ids = await fetchEmbyIdsByName('Test Actor');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/emby\/Persons\?/),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(ids).toEqual(['p1', 'p2']);
  });

  it('returns empty array for whitespace-only name without calling fetch', async () => {
    await expect(fetchEmbyIdsByName('   ')).resolves.toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
