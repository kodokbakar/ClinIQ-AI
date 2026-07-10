import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "./page";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

function mockApiResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(body),
  } as Response;
}

describe("Register page", () => {
  beforeEach(() => {
    pushMock.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("renders register copy and form fields", () => {
    render(<RegisterPage />);

    expect(
      screen.queryByRole("heading", {
        level: 1,
        name: /bangun naluri klinismu/i,
      }),
    ).toBeTruthy();

    expect(screen.queryByLabelText("Nama lengkap")).toBeTruthy();
    expect(screen.queryByLabelText("Email")).toBeTruthy();
    expect(screen.queryByLabelText("Password")).toBeTruthy();
    expect(screen.queryByLabelText("Konfirmasi password")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /buat akun belajar/i }),
    ).toBeTruthy();
  });

  it("shows validation errors for empty submit", () => {
    render(<RegisterPage />);

    fireEvent.submit(screen.getByTestId("register-form"));

    expect(screen.queryByText("Nama tidak boleh kosong.")).toBeTruthy();
    expect(screen.queryByText("Email tidak boleh kosong.")).toBeTruthy();
    expect(screen.queryByText("Password tidak boleh kosong.")).toBeTruthy();
    expect(
      screen.queryByText("Konfirmasi password tidak boleh kosong."),
    ).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows validation error for malformed email", () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Nama lengkap"), {
      target: { value: "Ari Purnama" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ari@@email.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByLabelText("Konfirmasi password"), {
      target: { value: "Password123" },
    });
    fireEvent.submit(screen.getByTestId("register-form"));

    expect(screen.queryByText("Format email tidak valid.")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("validates password length and confirmation match", () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Nama lengkap"), {
      target: { value: "Ari" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ari@email.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "12345" },
    });
    fireEvent.change(screen.getByLabelText("Konfirmasi password"), {
      target: { value: "different" },
    });
    fireEvent.submit(screen.getByTestId("register-form"));

    expect(screen.queryByText("Password minimal 6 karakter.")).toBeTruthy();
    expect(screen.queryByText("Konfirmasi password tidak cocok.")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits registration payload and redirects to login", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockApiResponse({
        success: true,
        message: "success",
        data: {
          id: "user-2",
          name: "Ari Purnama",
          email: "ari@email.com",
          status: true,
        },
      }),
    );

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Nama lengkap"), {
      target: { value: "Ari Purnama" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ari@email.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByLabelText("Konfirmasi password"), {
      target: { value: "Password123" },
    });
    fireEvent.submit(screen.getByTestId("register-form"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    const [url, options] = vi.mocked(fetch).mock.calls[0] as [
      string,
      RequestInit,
    ];

    expect(url).toContain("/api/v1/auth");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("include");
    expect(options.body).toBe(
      JSON.stringify({
        name: "Ari Purnama",
        email: "ari@email.com",
        password: "Password123",
      }),
    );

    expect(pushMock).toHaveBeenCalledWith("/login?registered=1");
  });

  it("shows API error message when registration fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockApiResponse(
        {
          success: false,
          message: "User already registered",
          data: null,
        },
        false,
      ),
    );

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("Nama lengkap"), {
      target: { value: "Ari Purnama" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "ari@email.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByLabelText("Konfirmasi password"), {
      target: { value: "Password123" },
    });
    fireEvent.submit(screen.getByTestId("register-form"));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeTruthy();
    });

    expect(screen.queryByText("User already registered")).toBeTruthy();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
