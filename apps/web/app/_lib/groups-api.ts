import type { ApiResult } from "./auth-api";

export type GroupRole = "admin" | "member";

export type GroupUser = {
  id: string;
  name: string;
  email: string;
};

export type GroupMember = {
  id: string;
  user_id: string;
  is_admin: boolean;
  joined_at: string;
  user: GroupUser;
};

export type GroupSummary = {
  id: string;
  name: string;
  description?: string | null;
  invite_code?: string;
  owner_id: string;
  member_count: number;
  my_role: GroupRole;
  createdAt?: string;
};

export type GroupDetails = GroupSummary & {
  members: GroupMember[];
  owner?: GroupUser;
};

type JoinGroupResponse = {
  message: string;
  group_id: string;
  group: GroupSummary;
};

type GroupActionResponse = {
  message: string;
};

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(
  /\/$/,
  "",
);

const API_BASE_URL =
  configuredApiBaseUrl ??
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");

async function requestGroupsApi<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    credentials: "include",
    ...init,
  });

  const result = (await response.json()) as ApiResult<T>;

  if (!response.ok) {
    throw new Error(result.message || "Permintaan grup gagal diproses.");
  }

  return result;
}

export async function getMyGroups(): Promise<GroupSummary[]> {
  const result = await requestGroupsApi<GroupSummary[]>("/api/v1/groups");

  return result.data ?? [];
}

export async function getGroupById(groupId: string): Promise<GroupDetails> {
  const result = await requestGroupsApi<GroupDetails>(
    `/api/v1/groups/${encodeURIComponent(groupId)}`,
  );

  if (!result.data) {
    throw new Error(result.message || "Detail grup tidak tersedia.");
  }

  return result.data;
}

export async function joinGroupByCode(
  inviteCode: string,
): Promise<GroupSummary> {
  const result = await requestGroupsApi<JoinGroupResponse>(
    "/api/v1/groups/join",
    {
      method: "POST",
      body: JSON.stringify({
        invite_code: inviteCode,
      }),
    },
  );

  if (!result.data?.group) {
    throw new Error(result.message || "Data grup tidak tersedia.");
  }

  return result.data.group;
}

export async function leaveGroup(groupId: string): Promise<void> {
  await requestGroupsApi<GroupActionResponse>(
    `/api/v1/groups/${encodeURIComponent(groupId)}/leave`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
  );
}

export async function disbandGroup(groupId: string): Promise<void> {
  await requestGroupsApi<GroupActionResponse>(
    `/api/v1/groups/${encodeURIComponent(groupId)}`,
    {
      method: "DELETE",
    },
  );
}
