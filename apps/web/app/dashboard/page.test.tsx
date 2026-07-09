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
  email: "dok@klinik.id",
  status: true,
  avatar: null,
  role_id: "role-1",
  last_updated_password: null,
  last_activity: null,
};

describe("Dashboard page", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders user dashboard", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockApiResponse({
        success: true,
        message: "success",
        data: {
          ...baseUser,
          role: { id: "role-1", name: "User" },
        },
      }),
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText(/Halo, Dok Bakar/i)).toBeTruthy();
    });

    expect(screen.queryByText("user dashboard")).toBeTruthy();
    expect(screen.queryByText("Learning workspace")).toBeTruthy();
    expect(screen.queryAllByText("dok@klinik.id").length).toBeGreaterThan(0);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("renders admin dashboard", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockApiResponse({
        success: true,
        message: "success",
        data: {
          ...baseUser,
          role: { id: "role-2", name: "Admin" },
        },
      }),
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText("admin klinik")).toBeTruthy();
    });

    expect(screen.queryByText("Clinic operations")).toBeTruthy();
  });

  it("renders superadmin dashboard", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockApiResponse({
        success: true,
        message: "success",
        data: {
          ...baseUser,
          is_superadmin: true,
          role: { id: "role-3", name: "Superadmin" },
        },
      }),
    );

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.queryByText("super admin")).toBeTruthy();
    });

    expect(screen.queryByText("Platform control")).toBeTruthy();
  });

  it("redirects to login when current user request fails", async () => {
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

    render(<DashboardPage />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
  });
});
