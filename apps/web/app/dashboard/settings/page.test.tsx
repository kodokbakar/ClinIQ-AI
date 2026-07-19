import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./page";

const replaceMock = vi.fn();
const currentUser = {
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
    vi.restoreAllMocks();
    replaceMock.mockReset();
    vi.spyOn(global, "fetch").mockImplementation(vi.fn());
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

  it("submits the backend password contract", async () => {
    vi.mocked(fetch).mockImplementation((input: RequestInfo | URL) => {
      if (String(input).includes("/api/v1/auth/me")) {
        return Promise.resolve(
          mockApiResponse({
            success: true,
            message: "success",
            data: currentUser,
          }),
        );
      }

      if (String(input).includes("/api/v1/auth/change-password")) {
        return Promise.resolve(
          mockApiResponse({
            success: true,
            message: "success",
            data: {
              changed_at: "2026-07-19T01:00:00.000Z",
            },
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected URL: ${String(input)}`));
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Ubah password.")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Password lama"), {
      target: {
        value: "Password123",
      },
    });

    fireEvent.change(screen.getByLabelText("Password baru"), {
      target: {
        value: "NewPassword123",
      },
    });

    fireEvent.change(screen.getByLabelText("Konfirmasi password"), {
      target: {
        value: "NewPassword123",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Simpan password",
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "Password berhasil diubah.",
      );
    });

    const passwordCall = vi
      .mocked(fetch)
      .mock.calls.find(([input]) =>
        String(input).includes("/api/v1/auth/change-password"),
      );

    expect(passwordCall).toBeTruthy();
    expect(passwordCall?.[1]?.method).toBe("PUT");

    expect(JSON.parse(String(passwordCall?.[1]?.body))).toEqual({
      old_password: "Password123",
      new_password: "NewPassword123",
      confirm_password: "NewPassword123",
    });
  });

  it("rejects weak passwords before requesting the API", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockApiResponse({
        success: true,
        message: "success",
        data: currentUser,
      }),
    );

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Ubah password.")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Password lama"), {
      target: {
        value: "Password123",
      },
    });

    fireEvent.change(screen.getByLabelText("Password baru"), {
      target: {
        value: "weakpass",
      },
    });

    fireEvent.change(screen.getByLabelText("Konfirmasi password"), {
      target: {
        value: "weakpass",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Simpan password",
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Password baru harus mengandung huruf kecil, huruf besar, dan angka.",
    );

    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([input]) =>
          String(input).includes("/api/v1/auth/change-password"),
        ),
    ).toBe(false);
  });
});
