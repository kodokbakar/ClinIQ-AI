import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "./page";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

function mockApiResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 401,
    json: () => Promise.resolve(body),
  } as Response;
}

const baseUser = {
  id: "user-1",
  name: "Dok Bakar",
  email: "dok@email.com",
  status: true,
  avatar: null,
  role_id: "role-1",
  last_updated_password: null,
  last_activity: null,
  role: {
    id: "role-1",
    name: "User",
  },
};

const attempts = [
  {
    id: "attempt-1",
    vignette_id: "vignette-1",
    disease_name: "Dengue Fever",
    disease_icd: "1D2Z",
    clues_revealed: 2,
    is_correct: true,
    score: 400,
    attempt_date: "2026-07-10",
    submitted_diagnosis: "Dengue Fever",
  },
];

const moreAttempts = [
  {
    id: "attempt-2",
    vignette_id: "vignette-2",
    disease_name: "Malaria",
    disease_icd: "1F40",
    clues_revealed: 1,
    is_correct: true,
    score: 500,
    attempt_date: "2026-07-09",
    submitted_diagnosis: "Malaria",
  },
];

const groups = [
  {
    id: "group-1",
    name: "Kelompok Belajar A",
    description: "Kelompok belajar untuk latihan quiz.",
    invite_code: "INVITEA1234",
    owner_id: "owner-1",
    member_count: 4,
    my_role: "member",
  },
];

const groupDetails = {
  ...groups[0],
  members: [
    {
      id: "member-1",
      user_id: "owner-1",
      is_admin: true,
      joined_at: "2026-07-10",
      user: {
        id: "owner-1",
        name: "Groups Owner",
        email: "owner@example.test",
      },
    },
    {
      id: "member-2",
      user_id: "user-1",
      is_admin: false,
      joined_at: "2026-07-11",
      user: {
        id: "user-1",
        name: "Dok Bakar",
        email: "dok@email.com",
      },
    },
  ],
};

describe("Dashboard page", () => {
  beforeEach(() => {
    replaceMock.mockReset();

    vi.spyOn(global, "fetch").mockImplementation(
      vi.fn((input: RequestInfo | URL) => {
        if (String(input).includes("/api/v1/auth/me")) {
          return Promise.resolve(
            mockApiResponse({
              success: true,
              message: "success",
              data: baseUser,
            }),
          );
        }

        if (String(input).includes("/api/v1/quiz/attempts/me")) {
          const isSecondPage = String(input).includes("page=2");

          return Promise.resolve(
            mockApiResponse({
              success: true,
              message: "success",
              metadata: {
                per_page: 3,
                current_page: isSecondPage ? 2 : 1,
                total_row: 10,
                total_page: 2,
                completed_attempts: 8,
                correct_attempts: 6,
                total_score: 900,
              },
              data: isSecondPage ? moreAttempts : attempts,
            }),
          );
        }

        if (String(input).includes("/api/v1/groups/group-1")) {
          return Promise.resolve(
            mockApiResponse({
              success: true,
              message: "success",
              data: groupDetails,
            }),
          );
        }

        if (String(input).includes("/api/v1/groups")) {
          return Promise.resolve(
            mockApiResponse({
              success: true,
              message: "success",
              data: groups,
            }),
          );
        }

        return Promise.reject(new Error(`unexpected url: ${String(input)}`));
      }),
    );
  });

  it("renders dashboard data and current group", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Halo, Dok Bakar/i)).toBeTruthy();
    });

    expect(screen.getByText("diagnostic study desk")).toBeTruthy();
    expect(screen.getByText("Dengue Fever")).toBeTruthy();
    expect(screen.getByText("400 pts")).toBeTruthy();
    expect(screen.getByText("Kelompok Belajar A")).toBeTruthy();

    const groupPanel = screen.getByRole("region", {
      name: "Status grup belajar",
    });

    expect(
      within(groupPanel).getByRole("button", {
        name: /leave group/i,
      }),
    ).toBeTruthy();

    expect(
      within(groupPanel).queryByRole("button", {
        name: /disband group/i,
      }),
    ).toBeNull();

    const memberListButton = within(groupPanel).getByRole("button", {
      name: /member list/i,
    });

    expect(screen.queryByText("owner@example.test")).toBeNull();

    fireEvent.click(memberListButton);

    const membersDialog = screen.getByRole("dialog", {
      name: "Anggota Kelompok Belajar A",
    });

    expect(within(membersDialog).getByText("Groups Owner")).toBeTruthy();
    expect(within(membersDialog).getByText("owner@example.test")).toBeTruthy();
    expect(within(membersDialog).getByText("dok@email.com")).toBeTruthy();

    const memberList = within(membersDialog).getByRole("list", {
      name: "Daftar anggota Kelompok Belajar A",
    });

    expect(within(memberList).getByText("Admin")).toBeTruthy();
    expect(within(memberList).getByText("Member")).toBeTruthy();

    expect(
      screen.getByText("Total Attempts").closest("article"),
    ).toHaveTextContent("10");

    expect(
      screen.getByText("Correct Cases").closest("article"),
    ).toHaveTextContent("6");

    expect(screen.getByText("Win Rate").closest("article")).toHaveTextContent(
      "75%",
    );

    expect(screen.getByText("Score").closest("article")).toHaveTextContent(
      "900",
    );

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("renders dashboard action links", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/Halo, Dok Bakar/i)).toBeTruthy();
    });

    expect(screen.getByRole("link", { name: /daily quiz/i })).toHaveAttribute(
      "href",
      "/quiz?mode=daily",
    );

    expect(screen.getByRole("link", { name: /random quiz/i })).toHaveAttribute(
      "href",
      "/quiz?mode=random",
    );

    expect(
      screen.queryByRole("button", {
        name: /join group/i,
      }),
    ).toBeNull();

    expect(
      screen.getByRole("heading", {
        name: "Lanjutkan latihan klinis.",
      }),
    ).toBeTruthy();
  });

  it("redirects to login when current user request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        if (String(input).includes("/api/v1/auth/me")) {
          return Promise.resolve(
            mockApiResponse(
              {
                success: false,
                message: "Unauthorized, token not found",
                data: null,
              },
              false,
            ),
          );
        }

        return Promise.reject(new Error(`unexpected url: ${String(input)}`));
      }),
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
  });

  it("loads and appends more attempt history", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Dengue Fever")).toBeTruthy();
    });

    expect(screen.queryByText("Malaria")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: /tampilkan lainnya/i,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("Malaria")).toBeTruthy();
    });

    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([url]) =>
          String(url).includes("/api/v1/quiz/attempts/me?page=2&limit=3"),
        ),
    ).toBe(true);

    expect(
      screen.queryByRole("button", {
        name: /tampilkan lainnya/i,
      }),
    ).toBeNull();
  });

  it("shows solo player when the user has no group", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        if (String(input).includes("/api/v1/auth/me")) {
          return Promise.resolve(
            mockApiResponse({
              success: true,
              message: "success",
              data: baseUser,
            }),
          );
        }

        if (String(input).includes("/api/v1/quiz/attempts/me")) {
          return Promise.resolve(
            mockApiResponse({
              success: true,
              message: "success",
              metadata: {
                per_page: 3,
                current_page: 1,
                total_row: 1,
                total_page: 1,
                completed_attempts: 1,
                correct_attempts: 1,
                total_score: 400,
              },
              data: attempts,
            }),
          );
        }

        if (String(input).includes("/api/v1/groups")) {
          return Promise.resolve(
            mockApiResponse({
              success: true,
              message: "success",
              data: [],
            }),
          );
        }

        return Promise.reject(new Error(`unexpected url: ${String(input)}`));
      }),
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Solo player")).toBeTruthy();
    });

    expect(screen.queryByText("Kelompok Belajar A")).toBeNull();

    const joinGroupButton = screen.getByRole("button", {
      name: /join group/i,
    });

    fireEvent.click(joinGroupButton);

    expect(
      screen.getByRole("dialog", {
        name: "Masukkan kode grup.",
      }),
    ).toBeTruthy();
  });
});
