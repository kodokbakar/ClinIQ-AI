import type { ApiResult } from "./auth-api";

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(
  /\/$/,
  "",
);

const API_BASE_URL =
  configuredApiBaseUrl ??
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");

async function requestAdminApi<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(init?.headers as Record<string, string>),
    },
    credentials: "include",
    ...init,
  });

  const result = (await response.json()) as ApiResult<T>;

  if (!response.ok) {
    throw new Error(result.message || "Permintaan admin gagal.");
  }

  return result;
}

export async function uploadICD(file: File): Promise<{
  created: number;
  updated: number;
  errors: number;
}> {
  const formData = new FormData();
  formData.append("file", file);

  const result = await requestAdminApi<{
    created: number;
    updated: number;
    errors: number;
  }>("/api/v1/admin/icd/upload", {
    method: "POST",
    body: formData,
  });

  if (!result.data) throw new Error(result.message || "Upload gagal.");
  return result.data;
}

export async function generateVignette(payload: {
  disease_id: string;
  difficulty?: string;
  locale?: string;
}): Promise<unknown> {
  const result = await requestAdminApi<unknown>(
    "/api/v1/admin/vignettes/generate",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (!result.data) throw new Error(result.message || "Generate gagal.");
  return result.data;
}

export async function bulkGenerateVignettes(payload: {
  limit?: number;
  difficulty?: string;
  locale?: string;
}): Promise<unknown> {
  const result = await requestAdminApi<unknown>(
    "/api/v1/admin/vignettes/bulk",
    {
      method: "POST",
      body: JSON.stringify({
        limit: payload.limit ?? 10,
        difficulty: payload.difficulty ?? "medium",
        locale: payload.locale ?? "id",
      }),
    },
  );

  if (!result.data) throw new Error(result.message || "Bulk generate gagal.");
  return result.data;
}

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  status: boolean;
  role?: {
    id: string;
    name: string;
  } | null;
};

export async function getAdminUsers(params?: {
  page?: number;
  limit?: number;
}): Promise<{ data: AdminUser[]; total: number }> {
  const queryParams = new URLSearchParams({
    page: String(params?.page ?? 1),
    limit: String(params?.limit ?? 100),
  });

  const result = await requestAdminApi<AdminUser[]>(
    `/api/v1/users?${queryParams.toString()}`,
  );

  const total = (result.metadata as { total_row?: number })?.total_row ?? (result.data?.length ?? 0);

  return {
    data: result.data ?? [],
    total,
  };
}

export async function toggleUserAccess(userId: string): Promise<void> {
  await requestAdminApi<void>(`/api/v1/users/${encodeURIComponent(userId)}/access`, {
    method: "PUT",
  });
}

export async function resetUserPassword(userId: string): Promise<string> {
  const result = await requestAdminApi<{ tempPassword?: string }>(
    `/api/v1/users/${encodeURIComponent(userId)}/reset-password`,
    {
      method: "POST",
    },
  );
  return result.message || "Password reset success.";
}

