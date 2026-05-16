const BASE_URL = 'http://localhost:4000/api/v1';

class ApiError extends Error {
  constructor(message, { status, code, details, requestId } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status || 0;
    this.code = code || 'UNKNOWN_ERROR';
    this.details = details;
    this.requestId = requestId || null;
  }
}

let accessToken = null;
let refreshToken = null;
let refreshHandler = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

export function setRefreshToken(token) {
  refreshToken = token || null;
}

export function getRefreshToken() {
  return refreshToken;
}

// login vaqtida bir marta ulab qo'ying:
// setRefreshHandler(async () => authApi.refresh({ refreshToken: getRefreshToken() }))
export function setRefreshHandler(handler) {
  refreshHandler = handler;
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildUrl(path, query) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${BASE_URL}${cleanPath}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url;
}

export async function apiRequest(path, { method = 'GET', body, query, auth = false, retry = true } = {}) {
  const url = buildUrl(path, query);
  const headers = { 'Content-Type': 'application/json' };

  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await parseJsonSafe(response);

  if (response.ok && payload?.success) {
    return payload.data;
  }

  const code = payload?.error?.code;
  const message = payload?.error?.message || `HTTP ${response.status}`;
  const details = payload?.error?.details;
  const requestId = payload?.meta?.requestId || null;

  if (response.status === 401 && retry && code === 'TOKEN_EXPIRED' && refreshToken && refreshHandler) {
    try {
      const refreshed = await refreshHandler();
      if (refreshed?.accessToken) {
        setAccessToken(refreshed.accessToken);
      }
      if (refreshed?.refreshToken) {
        setRefreshToken(refreshed.refreshToken);
      }
      return apiRequest(path, { method, body, query, auth, retry: false });
    } catch {
      setAccessToken(null);
      setRefreshToken(null);
    }
  }

  throw new ApiError(message, {
    status: response.status,
    code,
    details,
    requestId,
  });
}

export { ApiError };
