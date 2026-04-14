const API_BASE = import.meta.env.VITE_API_URL ?? '';
const USER_ID_KEY = 'criteria:user_id';

export function getUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

export function setUserId(id: string) {
  localStorage.setItem(USER_ID_KEY, id);
}

export function clearUserId() {
  localStorage.removeItem(USER_ID_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown
  ) {
    super(message);
  }
}

export async function apiFetch<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  const uid = getUserId();
  if (uid) headers['x-user-id'] = uid;

  const res = await fetch(`${API_BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(
      (parsed && (parsed as { error?: string }).error) ?? res.statusText,
      res.status,
      parsed
    );
  }
  return parsed as T;
}
