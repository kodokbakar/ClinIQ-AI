import { render, screen, waitFor } from "@testing-library/react";
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
  role: { id: "role-1", name: "User" },
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

describe("Dashboard page", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/v1/auth/me")) {
          return Promise.resolve(
            mockApiResponse({
              success: true,
              message: "success",
              data: baseUser,
            }),
          );
        }

        if (url.includes("/api/v1/quiz/attempts/me")) {
          return Promise.resolve(
            mockApiResponse({
              success: true,
              message: "success",
              metadata: {
                per_page: 5,
                current_page: 1,
                total_row: 1,
                total_page: 1,
              },
              data: attempts,
            }),
          );
        }

        return Promise.reject(new Error("unexpected url"));
      }),
    );
  });

  it("renders diagnostic dashboard from current user and attempts", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText(/Halo, Dok Bakar/i)).toBeTruthy();
    });

    expect(screen.queryByText("diagnostic study desk")).toBeTruthy();
    expect(screen.queryByText("Dengue Fever")).toBeTruthy();
    expect(screen.queryByText("400")).toBeTruthy();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("renders dashboard action links", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText(/Halo, Dok Bakar/i)).toBeTruthy();
    });

    expect(screen.getByRole("link", { name: /daily quiz/i })).toHaveAttribute(
      "href",
      "/quiz?mode=daily",
    );
    expect(screen.getByRole("link", { name: /random quiz/i })).toHaveAttribute(
      "href",
      "/quiz?mode=random",
    );
    expect(screen.getByRole("link", { name: /join group/i })).toHaveAttribute(
      "href",
      "/groups/join",
    );
  });

  it("redirects to login when current user request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("/api/v1/auth/me")) {
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

        return Promise.reject(new Error("unexpected url"));
      }),
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
  });
});
