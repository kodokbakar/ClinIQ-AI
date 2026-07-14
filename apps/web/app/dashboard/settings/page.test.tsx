import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./page";

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

describe("Settings page", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders account settings from current user", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockApiResponse({
        success: true,
        message: "success",
        data: {
          id: "user-1",
          name: "Dok Bakar",
          email: "dok@email.com",
          status: true,
          avatar: null,
          role_id: "role-1",
          last_updated_password: null,
          last_activity: null,
          role: { id: "role-1", name: "User" },
        },
      }),
    );

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.queryByText("Profil belajar dan sesi.")).toBeTruthy();
    });

    expect(screen.queryByText("Dok Bakar")).toBeTruthy();
    expect(screen.queryByText("dok@email.com")).toBeTruthy();
    expect(screen.queryAllByText("User").length).toBeGreaterThan(0);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects to login when settings request fails", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockApiResponse(
        {
          success: false,
          message: "Unauthorized, token not found",
          data: null,
        },
        false,
      ),
    );

    render(<SettingsPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
  });
});
