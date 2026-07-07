export type ApiResult<T> = {
  success: boolean;
  message: string;
  data: T | null;
  metadata?: Record<string, unknown>;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  is_superadmin?: boolean;
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

  const result = (await response.json()) as ApiResult<T>;

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Permintaan gagal diproses.");
  }

  if (!result.data) {
    throw new Error("Respons server tidak valid.");
  }

  return result.data;
}

export function loginUser(payload: LoginPayload): Promise<AuthUser> {
  return requestJson<AuthUser>("/api/dashboard/auth/login", payload);
}

export function registerUser(payload: RegisterPayload): Promise<AuthUser> {
  return requestJson<AuthUser>("/api/dashboard/auth/register", payload);
}
