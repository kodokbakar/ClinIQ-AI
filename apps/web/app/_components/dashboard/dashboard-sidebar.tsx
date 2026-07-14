"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutUser } from "../../_lib/auth-api";
import "./dashboard-sidebar.css";

const links = [
  { href: "/dashboard", label: "Study Desk", meta: "Overview" },
  { href: "/dashboard#daily-case", label: "Daily Case", meta: "Practice" },
  { href: "/dashboard/settings", label: "Account", meta: "Profile" },
];

export function DashboardSidebar() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        setIsAccountOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function closeMobileMenu() {
    setIsMenuOpen(false);
    setIsAccountOpen(false);
  }

  async function handleLogout() {
    try {
      setError("");
      setIsLoggingOut(true);
      await logoutUser();
      router.replace("/login");
    } catch {
      setError("Logout gagal. Coba lagi.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <aside
      className="diagnostic-sidebar"
      data-menu-open={isMenuOpen ? "true" : "false"}
    >
      <div className="diagnostic-mobile-bar lg:hidden">
        <Link
          href="/"
          className="diagnostic-brand"
          aria-label="Kembali ke beranda clinIQ AI"
        >
          <span className="diagnostic-brand__mark">cQ</span>
          <span>
            <span className="diagnostic-brand__name">clinIQ AI</span>
            <span className="diagnostic-brand__tag">diagnostic quiz</span>
          </span>
        </Link>

        <button
          type="button"
          className="diagnostic-menu-button"
          aria-controls="dashboard-menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((value) => !value)}
        >
          <span className="sr-only">
            {isMenuOpen ? "Tutup menu dashboard" : "Buka menu dashboard"}
          </span>
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        aria-label="Tutup backdrop menu dashboard"
        className="diagnostic-menu-backdrop lg:hidden"
        onClick={closeMobileMenu}
      />

      <div id="dashboard-menu" className="diagnostic-sidebar__inner">
        <Link
          href="/"
          className="diagnostic-brand diagnostic-brand--desktop"
          aria-label="Kembali ke beranda clinIQ AI"
          onClick={closeMobileMenu}
        >
          <span className="diagnostic-brand__mark">cQ</span>
          <span>
            <span className="diagnostic-brand__name">clinIQ AI</span>
            <span className="diagnostic-brand__tag">diagnostic quiz</span>
          </span>
        </Link>

        <nav className="diagnostic-nav" aria-label="Navigasi dashboard">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="diagnostic-nav__link"
              onClick={closeMobileMenu}
            >
              <span>{link.label}</span>
              <small>{link.meta}</small>
            </Link>
          ))}
        </nav>

        <div className="diagnostic-note" aria-label="Learning note">
          <span className="diagnostic-note__label">Method</span>
          <p>Read clues first. Guess carefully. Learn from the explanation.</p>
        </div>

        <div className="diagnostic-account">
          {isAccountOpen ? (
            <div
              role="menu"
              aria-label="Menu akun"
              className="diagnostic-account__menu"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="diagnostic-account__logout"
              >
                {isLoggingOut ? "Logout..." : "Logout"}
              </button>

              {error ? (
                <p role="alert" className="diagnostic-account__error">
                  {error}
                </p>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={isAccountOpen}
            onClick={() => setIsAccountOpen((value) => !value)}
            className="diagnostic-account__button"
          >
            <span>
              <span>Akun</span>
              <small>Sesi aktif</small>
            </span>
            <span aria-hidden="true">{isAccountOpen ? "↑" : "↓"}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
