export type ApiResult<T> = {
  success: boolean;
  message: string;
  data: T | null;
  metadata?: Record<string, unknown>;
};

export type AuthRole = {
  id: string;
  name: string;
  is_superadmin?: boolean;
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

export function canAccessAdmin(
  user: Pick<AuthUser, "is_superadmin" | "role">,
): boolean {
  const roleName = user.role?.name.trim().toLowerCase();

  return (
    user.is_superadmin === true ||
    user.role?.is_superadmin === true ||
    roleName === "admin"
  );
}

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
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

  if (result.data === null) {
    throw new Error(result.message || "Respons server tidak valid.");
  }

  return result.data;
}

async function requestJson<T>(
  path: string,
  payload: Record<string, unknown>,
  method: "POST" | "PUT" = "POST",
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
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
  return requestJson<AuthUser>("/api/v1/auth/login", payload);
}

export type ChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangePasswordResult = {
  changed_at: string;
};

export function registerUser(payload: RegisterPayload): Promise<AuthUser> {
  return requestJson<AuthUser>("/api/v1/auth", payload);
}

export function logoutUser(): Promise<boolean> {
  return requestJson<boolean>("/api/v1/auth/logout", {});
}

export function changePassword(
  payload: ChangePasswordPayload,
): Promise<ChangePasswordResult> {
  return requestJson<ChangePasswordResult>(
    "/api/v1/auth/change-password",
    {
      old_password: payload.oldPassword,
      new_password: payload.newPassword,
      confirm_password: payload.confirmPassword,
    },
    "PUT",
  );
}

export async function getCurrentUser(cookieHeader?: string): Promise<AuthUser> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cookieHeader) headers.Cookie = cookieHeader;

  const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers,
    credentials: "include",
    cache: "no-store",
  });

  return parseApiResponse<AuthUser>(response);
}

export async function getCurrentUserServer(): Promise<AuthUser | null> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const cookieHeader = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  if (!cookieHeader) return null;
  try {
    return await getCurrentUser(cookieHeader);
  } catch {
    return null;
  }
}
