import { appUrl } from '../lib/basePath';
import type { Problem } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string[]> | undefined;

  constructor(status: number, code: string, title: string, fieldErrors?: Record<string, string[]>) {
    super(title);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/** `path` is site-relative (`/api/...`); the result carries the app's folder when it runs in one. */
function buildUrl(path: string, query?: QueryParams): string {
  path = appUrl(path);
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== null && value !== undefined && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function toApiError(response: Response): Promise<ApiError> {
  let problem: Partial<Problem> = {};
  try {
    problem = (await response.json()) as Partial<Problem>;
  } catch {
    // Not JSON (proxy error page, empty 401/403 body): fall back to a status-derived code.
  }
  const fallbackCode =
    response.status === 401 ? 'unauthenticated' : response.status === 403 ? 'forbidden' : 'unknown';
  return new ApiError(
    response.status,
    problem.code ?? fallbackCode,
    problem.title ?? response.statusText,
    problem.errors,
  );
}

async function request<T>(
  method: string,
  path: string,
  options: { query?: QueryParams; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  // Cheap CSRF guard the API requires on every state-changing request.
  if (method !== 'GET') headers['X-Requested-With'] = 'PointHub';

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body; // the browser sets the multipart boundary
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), { method, headers, body, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'network', 'Network error');
  }
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: QueryParams) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, query?: QueryParams) => request<T>('POST', path, { body, query }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export type Download = {
  filename: string;
  /** The export hit the server's row cap (`X-Export-Truncated: true`): the file does not hold every row. */
  truncated: boolean;
};

/** `filename*=UTF-8''…` wins over the plain `filename=`; both may be quoted. */
function fileNameFrom(disposition: string | null, fallback: string): string {
  if (!disposition) return fallback;
  const encoded = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(disposition)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim().replace(/^"|"$/g, ''));
    } catch {
      // malformed escape: fall back to the plain name
    }
  }
  const plain = /filename\s*=\s*(?:"([^"]*)"|([^;]+))/i.exec(disposition);
  return (plain?.[1] ?? plain?.[2])?.trim() || fallback;
}

/**
 * GETs a file (the CSV exports) with the session cookie and hands it to the browser as a download, named as
 * the server's `Content-Disposition` says. Errors are the same `ApiError`s as `api.get`.
 */
export async function downloadFile(path: string, query?: QueryParams, fallbackName = 'export.csv'): Promise<Download> {
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), { headers: { Accept: 'text/csv, application/problem+json' }, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'network', 'Network error');
  }
  if (!response.ok) throw await toApiError(response);

  const filename = fileNameFrom(response.headers.get('Content-Disposition'), fallbackName);
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // The download reads the blob after the click; give it time before the URL goes away.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return { filename, truncated: response.headers.get('X-Export-Truncated')?.toLowerCase() === 'true' };
}

/**
 * Multipart POST that reports upload progress (0–1), which `fetch` cannot do. Same headers and the same
 * `ApiError`s as `api.post`.
 */
export function uploadWithProgress<T>(path: string, form: FormData, onProgress?: (fraction: number) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', appUrl(path));
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'PointHub');
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total);
    };
    xhr.onerror = () => reject(new ApiError(0, 'network', 'Network error'));
    xhr.onload = () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(xhr.responseText);
      } catch {
        parsed = undefined; // not JSON: a proxy error page or an empty body
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(parsed as T);
        return;
      }
      const problem = (parsed ?? {}) as Partial<Problem>;
      const fallbackCode = xhr.status === 401 ? 'unauthenticated' : xhr.status === 403 ? 'forbidden' : 'unknown';
      reject(new ApiError(xhr.status, problem.code ?? fallbackCode, problem.title ?? xhr.statusText, problem.errors));
    };
    xhr.send(form);
  });
}
