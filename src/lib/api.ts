import { getAdminSessionToken, setAdminSessionToken, subscribeToAdminSession } from "@/lib/admin-session";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

interface ErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
    request_id?: string;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details?: unknown,
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit, authenticated: boolean): Promise<T> {
  const token = authenticated ? getAdminSessionToken() : null;
  if (authenticated && !token) {
    throw new ApiError("Sign in to continue.", 401, "ADMIN_AUTH_REQUIRED");
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  const assertSession = () => {
    if (authenticated && getAdminSessionToken() !== token) {
      throw new ApiError("Your administrator session has changed.", 401, "ADMIN_SESSION_CHANGED");
    }
  };
  const unsubscribe = authenticated
    ? subscribeToAdminSession(() => {
        if (getAdminSessionToken() !== token) abort();
      })
    : () => {};
  init.signal?.addEventListener("abort", abort, { once: true });
  if (init.signal?.aborted) abort();
  try {
    let response: Response;
    try {
      response = await fetch(`${API_URL}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
      });
    } catch (cause) {
      assertSession();
      if (controller.signal.aborted) throw cause;
      throw new ApiError(
        "The admin API is unreachable. Check the backend and try again.",
        0,
        "NETWORK_ERROR",
        cause,
      );
    }
    assertSession();
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
      assertSession();
      if (response.status === 401 && authenticated) setAdminSessionToken(null);
      throw new ApiError(
        payload?.error?.message ?? "The request could not be completed.",
        response.status,
        payload?.error?.code ?? `HTTP_${response.status}`,
        payload?.error?.details,
        payload?.error?.request_id ?? response.headers.get("x-request-id") ?? undefined,
      );
    }
    if (response.status === 204) return undefined as T;
    const result = await response.json();
    assertSession();
    return result as T;
  } finally {
    unsubscribe();
    init.signal?.removeEventListener("abort", abort);
  }
}

export function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init, true);
}

export function publicApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init, false);
}
