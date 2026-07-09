"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser, type AuthUser } from "../_lib/auth-api";

function formatDate(value?: string | null): string {
  if (!value) return "Belum ada aktivitas";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getRoleName(user: AuthUser): string {
  return user.role?.name ?? (user.is_superadmin ? "Superadmin" : "User");
}

function getDashboardCopy(roleName: string) {
  if (roleName === "Superadmin") {
    return {
      eyebrow: "super admin",
      title: "Pusat kendali seluruh workspace.",
      description:
        "Pantau status platform, kelola akses tertinggi, dan pastikan alur klinik tetap siap digunakan.",
      cards: [
        ["Akses", "Semua modul"],
        ["Prioritas", "Keamanan sistem"],
        ["Mode", "Platform control"],
      ],
    };
  }

  if (roleName === "Admin") {
    return {
      eyebrow: "admin klinik",
      title: "Kelola operasional klinik dengan lebih rapi.",
      description:
        "Pantau user, dukung aktivitas belajar, dan jaga data klinik tetap siap dipakai tim.",
      cards: [
        ["Akses", "Manajemen klinik"],
        ["Prioritas", "User dan konten"],
        ["Mode", "Clinic operations"],
      ],
    };
  }

  return {
    eyebrow: "user dashboard",
    title: "Ruang belajar klinikmu sudah siap.",
    description:
      "Lanjutkan latihan, tinjau progres, dan gunakan materi klinis yang tersedia untuk memperkuat diagnosis.",
    cards: [
      ["Akses", "Latihan klinik"],
      ["Prioritas", "Quiz dan progres"],
      ["Mode", "Learning workspace"],
    ],
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getCurrentUser()
      .then((currentUser) => {
        if (isMounted) setUser(currentUser);
      })
      .catch(() => {
        router.replace("/login");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return (
      <section className="clay-panel grid min-h-[calc(100svh-2.5rem)] place-items-center rounded-[2.4rem] p-8 text-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--muted)]">
            Memuat dashboard
          </p>
          <h1 className="mt-4 font-[var(--font-display)] text-5xl font-semibold tracking-[-0.06em]">
            Menyiapkan ruang kerja...
          </h1>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="clay-panel grid min-h-[calc(100svh-2.5rem)] place-items-center rounded-[2.4rem] p-8 text-center">
        <h1 className="font-[var(--font-display)] text-4xl font-semibold tracking-[-0.06em]">
          Mengarahkan ke halaman masuk.
        </h1>
      </section>
    );
  }

  const roleName = getRoleName(user);
  const dashboard = getDashboardCopy(roleName);

  return (
    <section className="grid gap-6">
      <div className="clay-panel rounded-[2.4rem] p-6 sm:p-8 lg:p-10">
        <p className="mb-5 inline-flex rounded-full bg-[rgba(154,170,131,0.34)] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[var(--absinthe-deep)] shadow-[inset_4px_4px_10px_rgba(80,97,71,0.12),inset_-4px_-4px_10px_rgba(255,255,237,0.8)]">
          {dashboard.eyebrow}
        </p>

        <h1 className="font-[var(--font-display)] text-5xl font-semibold leading-[0.94] tracking-[-0.07em] sm:text-6xl">
          Halo, {user.name}. {dashboard.title}
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--muted)]">
          {dashboard.description}
        </p>

        <div className="mt-9 grid gap-3 sm:grid-cols-3">
          {dashboard.cards.map(([label, value]) => (
            <article
              key={label}
              className="clay-inset rounded-[1.7rem] px-5 py-4"
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">
                {label}
              </p>
              <p className="mt-2 break-words font-black text-[var(--ink)]">
                {value}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.82fr]">
        <section className="clay-panel rounded-[2.4rem] p-6">
          <h2 className="font-[var(--font-display)] text-4xl font-semibold tracking-[-0.06em]">
            Ringkasan akun
          </h2>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ["Role", roleName],
              ["Email", user.email],
              ["Status", user.status === false ? "Tidak aktif" : "Aktif"],
              ["Aktivitas", formatDate(user.last_activity)],
            ].map(([label, value]) => (
              <article key={label} className="clay-inset rounded-[1.5rem] p-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">
                  {label}
                </p>
                <p className="mt-2 break-words font-black">{value}</p>
              </article>
            ))}
          </div>
        </section>

        <aside
          aria-label="Profil dashboard"
          className="clay-panel rounded-[2.4rem] p-6"
        >
          <div className="flex items-center gap-4">
            <div className="grid size-20 place-items-center rounded-[1.7rem] bg-[var(--fig)] font-[var(--font-display)] text-4xl font-semibold text-[var(--cream)] shadow-[12px_14px_26px_rgba(83,67,43,0.24)]">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h2 className="font-[var(--font-display)] text-4xl font-semibold tracking-[-0.06em]">
                {roleName}
              </h2>
              <p className="font-bold text-[var(--muted)]">{user.email}</p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
