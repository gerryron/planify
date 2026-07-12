// ---------------------------------------------------------------------------
// Shared frontend HTTP client.
//
// Replaces the duplicated `buildApiError` / `readError` helpers that were
// copy‑pasted across every feature service file.
//
// Usage (inside a feature service):
//   import { apiClient } from '@/core/http/apiClient';
//   const wallets = await apiClient.get<Wallet[]>('/api/wallets');
//   const created = await apiClient.post<Wallet>('/api/wallets', payload);
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let message = `Request failed with status ${res.status}`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body?.error) message = body.error;
  } catch {
    // Response body is not JSON – keep the default message.
  }
  return new ApiError(res.status, message);
}

// ---------------------------------------------------------------------------
// Client implementation
// ---------------------------------------------------------------------------
interface ApiClientConfig {
  baseUrl: string;
  headers: Record<string, string>;
}

class ApiClient {
  private config: ApiClientConfig;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? '',
      headers: { 'Content-Type': 'application/json', ...config.headers },
    };
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  async delete<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('DELETE', path, body);
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.config.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: this.config.headers,
    };

    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);

    if (!res.ok) {
      throw await parseError(res);
    }

    // 204 No Content
    if (res.status === 204) {
      return undefined as unknown as T;
    }

    return res.json() as Promise<T>;
  }
}

// Singleton – every feature service imports this same instance.
export const apiClient = new ApiClient();
