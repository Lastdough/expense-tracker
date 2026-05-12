const BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/u, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  readonly error?: { readonly code?: string; readonly message?: string };
}

async function parseError(res: Response): Promise<ApiError> {
  let code = 'unknown_error';
  let message = `${res.status} ${res.statusText}`;
  try {
    const body = (await res.json()) as ErrorBody;
    if (body.error?.code) code = body.error.code;
    if (body.error?.message) message = body.error.message;
  } catch {
    /* non-JSON body */
  }
  return new ApiError(res.status, code, message);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
};
