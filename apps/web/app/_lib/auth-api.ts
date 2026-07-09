export type ApiResult<T> = {
  success: boolean;
  message: string;
  data: T | null;
  metadata?: Record<string, unknown>;
};

export type AuthRole = {
  id: string;
  name: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  is_superadmin?: boolean;
  status?: boolean;
  avatar?: string | null;
  role_id?: string | null;
  last_updated_password?: string | null;
  last_activity?: string | null;
  role?: AuthRole | null;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
};

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(
  /\/$/,
  "",
);

const API_BASE_URL =
  configuredApiBaseUrl ??
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");

async function parseApiResponse<T>(response: Response): Promise<T> {
  const result = (await response.json()) as ApiResult<T>;

  if (!response.ok) {
    throw new Error(result.message || "Permintaan gagal diproses.");
  }

  if (!result.data) {
    throw new Error(result.message || "Respons server tidak valid.");
  }

  return result.data;
}

async function requestJson<T>(
  path: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return parseApiResponse<T>(response);
}

export function loginUser(payload: LoginPayload): Promise<AuthUser> {
  return requestJson<AuthUser>("/api/dashboard/auth/login", payload);
}

export function registerUser(payload: RegisterPayload): Promise<AuthUser> {
  return requestJson<AuthUser>("/api/dashboard/auth/register", payload);
}

export function logoutUser(): Promise<boolean> {
  return requestJson<boolean>("/api/dashboard/auth/logout", {});
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard/auth/me`, {
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  return parseApiResponse<AuthUser>(response);
}
