import type { ApiResult } from "./auth-api";

export type LeaderboardEntry = {
  user_id: string;
  name: string;
  score: number;
};

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(
  /\/$/,
  "",
);

const API_BASE_URL =
  configuredApiBaseUrl ??
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");

async function requestLeaderboardApi<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    credentials: "include",
    ...init,
  });

  const result = (await response.json()) as ApiResult<T>;

  if (!response.ok) {
    throw new Error(result.message || "Gagal memuat leaderboard.");
  }

  return result;
}

export async function getGlobalLeaderboard(): Promise<LeaderboardEntry[]> {
  const result = await requestLeaderboardApi<LeaderboardEntry[]>(
    "/api/v1/leaderboards/global",
  );
  return result.data ?? [];
}

export async function getGroupLeaderboard(
  groupId: string,
): Promise<LeaderboardEntry[]> {
  const result = await requestLeaderboardApi<LeaderboardEntry[]>(
    `/api/v1/leaderboards/group/${encodeURIComponent(groupId)}`,
  );
  return result.data ?? [];
}
