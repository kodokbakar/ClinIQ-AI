import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

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

describe("Login page", () => {
  beforeEach(() => {
    pushMock.mockReset();
    vi.spyOn(global, "fetch").mockImplementation(vi.fn());
  });

  it("renders login copy and form fields", () => {
    render(<LoginPage />);

    expect(
      screen.queryByRole("heading", {
        level: 1,
        name: /masuk ke ruang diagnosis/i,
      }),
    ).toBeTruthy();

    expect(screen.queryByLabelText("Email")).toBeTruthy();
    expect(screen.queryByLabelText("Password")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /masuk dan lanjut belajar/i }),
    ).toBeTruthy();
  });

  it("shows validation errors for empty submit", () => {
    render(<LoginPage />);

    fireEvent.submit(screen.getByTestId("login-form"));

    expect(screen.queryByText("Email tidak boleh kosong.")).toBeTruthy();
    expect(screen.queryByText("Password tidak boleh kosong.")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("shows validation error for malformed email", () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "dok@@email.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123" },
    });
    fireEvent.submit(screen.getByTestId("login-form"));

    expect(screen.queryByText("Format email tidak valid.")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits login credentials and redirects to dashboard", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockApiResponse({
        success: true,
        message: "success",
        data: {
          id: "user-1",
          name: "Dok Bakar",
          email: "dok@email.com",
          is_superadmin: false,
        },
      }),
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "dok@email.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Password123" },
    });
    fireEvent.submit(screen.getByTestId("login-form"));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    const [url, options] = vi.mocked(fetch).mock.calls[0] as [
      string,
      RequestInit,
    ];

    expect(url).toContain("/api/v1/auth/login");
    expect(options.method).toBe("POST");
    expect(options.credentials).toBe("include");
    expect(options.body).toBe(
      JSON.stringify({
        email: "dok@email.com",
        password: "Password123",
      }),
    );

    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("shows API error message when login fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockApiResponse(
        {
          success: false,
          message: "Invalid email or password",
          data: null,
        },
        false,
      ),
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "wrong@email.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.submit(screen.getByTestId("login-form"));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeTruthy();
    });

    expect(screen.queryByText("Invalid email or password")).toBeTruthy();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
