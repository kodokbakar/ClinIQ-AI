"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logoutUser } from "../../_lib/auth-api";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/settings", label: "Pengaturan" },
];

export function DashboardSidebar() {
  const router = useRouter();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

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
    <aside className="clay-panel flex rounded-[2rem] p-5 lg:sticky lg:top-6 lg:h-[calc(100svh-3rem)]">
      <div className="flex w-full flex-col">
        <Link
          href="/"
          className="focus-clay inline-flex items-center gap-3 rounded-full"
          aria-label="Kembali ke beranda clinIQ AI"
        >
          <span className="grid size-11 place-items-center rounded-[1.1rem] bg-[var(--ink)] text-sm font-black text-[var(--cream)] shadow-[7px_8px_18px_rgba(69,55,36,0.26)]">
            cQ
          </span>
          <span className="leading-none">
            <span className="block font-[var(--font-display)] text-xl font-semibold tracking-[-0.04em]">
              clinIQ AI
            </span>
            <span className="block text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
              workspace
            </span>
          </span>
        </Link>

        <nav aria-label="Navigasi dashboard" className="mt-8 grid gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="focus-clay clay-inset rounded-[1.35rem] px-4 py-3 text-sm font-black text-[var(--ink)] transition hover:-translate-y-0.5"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="relative mt-8 lg:mt-auto">
          {isAccountOpen ? (
            <div
              role="menu"
              aria-label="Menu akun"
              className="clay-inset absolute bottom-full left-0 mb-3 w-full rounded-[1.5rem] p-3"
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="focus-clay w-full rounded-[1.15rem] bg-[var(--fig)] px-4 py-3 text-left text-sm font-black text-[var(--cream)] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isLoggingOut ? "Logout..." : "Logout"}
              </button>

              {error ? (
                <p
                  role="alert"
                  className="mt-3 text-sm font-extrabold text-[var(--fig)]"
                >
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
            className="focus-clay clay-button flex w-full items-center justify-between rounded-[1.5rem] bg-[var(--cream)] px-4 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-black text-[var(--ink)]">
                Akun
              </span>
              <span className="block text-xs font-bold text-[var(--muted)]">
                Sesi aktif
              </span>
            </span>
            <span aria-hidden="true" className="font-black text-[var(--fig)]">
              {isAccountOpen ? "↑" : "↓"}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
