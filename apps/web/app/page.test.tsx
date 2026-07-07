import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home landing page", () => {
  it("renders the Indonesian hero content", () => {
    render(<Home />);

    const heading = screen.getByRole("heading", {
      level: 1,
      name: /catatan klinis yang tidak terasa seperti tumpukan administrasi/i,
    });

    expect(heading).toBeTruthy();
    expect(
      screen.getByText(/clinIQ AI membantu mengubah intake pasien/i),
    ).toBeTruthy();
  });

  it("renders primary navigation with section anchors", () => {
    render(<Home />);

    const navigation = screen.getByRole("navigation", {
      name: /navigasi utama/i,
    });

    const productLink = within(navigation).getByRole("link", {
      name: "Produk",
    });
    const workflowLink = within(navigation).getByRole("link", {
      name: "Alur",
    });
    const safetyLink = within(navigation).getByRole("link", {
      name: "Keamanan",
    });

    expect(productLink.getAttribute("href")).toBe("#produk");
    expect(workflowLink.getAttribute("href")).toBe("#alur");
    expect(safetyLink.getAttribute("href")).toBe("#keamanan");
  });

  it("renders auth entry points for the upcoming auth pages", () => {
    render(<Home />);

    const registerLink = screen.getByRole("link", {
      name: "Mulai bentuk catatan",
    });

    expect(registerLink.getAttribute("href")).toBe("/register");

    const signInLinks = screen.getAllByRole("link", { name: "Masuk" });
    const headerSignInLink = signInLinks[0];

    expect(signInLinks.length).toBeGreaterThan(0);
    expect(headerSignInLink?.getAttribute("href")).toBe("/login");
  });

  it("renders product preview, workflow, and safety sections", () => {
    render(<Home />);

    expect(
      screen.getByRole("complementary", { name: /pratinjau produk/i }),
    ).toBeTruthy();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /tiga langkah lembut/i,
      }),
    ).toBeTruthy();

    expect(screen.getByText("Dengar")).toBeTruthy();
    expect(screen.getByText("Bentuk")).toBeTruthy();
    expect(screen.getByText("Tinjau")).toBeTruthy();

    expect(
      screen.getByRole("heading", {
        level: 2,
        name: /antarmuka hangat/i,
      }),
    ).toBeTruthy();

    expect(
      screen.getByText(/output untuk pasien membutuhkan persetujuan manusia/i),
    ).toBeTruthy();
  });

  it("renders clinical trust metrics and queue items", () => {
    render(<Home />);

    expect(screen.getByText("42d")).toBeTruthy();
    expect(screen.getByText("8,7k")).toBeTruthy();
    expect(screen.getByText("24/7")).toBeTruthy();

    expect(screen.getByText("Maya R.")).toBeTruthy();
    expect(screen.getByText("Ari P.")).toBeTruthy();
    expect(screen.getByText("Nora S.")).toBeTruthy();
  });
});
