import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardSidebar } from "./dashboard-sidebar";

const replaceMock = vi.fn();
const logoutUserMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock("../../_lib/auth-api", () => ({
  logoutUser: () => logoutUserMock(),
}));

describe("DashboardSidebar", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    logoutUserMock.mockReset();
  });

  it("toggles mobile dashboard menu", () => {
    render(<DashboardSidebar />);

    const menuButton = screen.getByRole("button", {
      name: /buka menu dashboard/i,
    });
    const sidebar = screen.getByRole("complementary");

    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(sidebar).toHaveAttribute("data-menu-open", "false");

    fireEvent.click(menuButton);

    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    expect(sidebar).toHaveAttribute("data-menu-open", "true");
  });

  it("closes mobile menu with Escape", () => {
    render(<DashboardSidebar />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /buka menu dashboard/i,
      }),
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.getByRole("complementary")).toHaveAttribute(
      "data-menu-open",
      "false",
    );
  });

  it("opens account menu", () => {
    render(<DashboardSidebar />);

    fireEvent.click(screen.getByRole("button", { name: /akun/i }));

    expect(screen.queryByRole("menu", { name: /menu akun/i })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Logout" })).toBeTruthy();
  });

  it("logs out and redirects to login", async () => {
    logoutUserMock.mockResolvedValueOnce(true);

    render(<DashboardSidebar />);

    fireEvent.click(screen.getByRole("button", { name: /akun/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Logout" }));

    await waitFor(() => {
      expect(logoutUserMock).toHaveBeenCalledTimes(1);
    });

    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("shows logout error", async () => {
    logoutUserMock.mockRejectedValueOnce(new Error("failed"));

    render(<DashboardSidebar />);

    fireEvent.click(screen.getByRole("button", { name: /akun/i }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Logout" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeTruthy();
    });

    expect(screen.queryByText("Logout gagal. Coba lagi.")).toBeTruthy();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
