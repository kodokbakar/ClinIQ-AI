"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser, type AuthUser } from "../../_lib/auth-api";

function formatDate(value?: string | null): string {
  if (!value) return "Belum pernah diperbarui";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function SettingsPage() {
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
      <section className="clay-panel rounded-[2.4rem] p-8">
        <p className="text-sm font-black uppercase tracking-[0.22em] text-[var(--muted)]">
          Memuat pengaturan
        </p>
        <h1 className="mt-4 font-[var(--font-display)] text-5xl font-semibold tracking-[-0.06em]">
          Mengambil profil...
        </h1>
      </section>
    );
  }

  if (!user) return null;

  return (
    <section className="grid gap-6">
      <div className="clay-panel rounded-[2.4rem] p-6 sm:p-8 lg:p-10">
        <p className="mb-5 inline-flex rounded-full bg-[rgba(154,170,131,0.34)] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[var(--absinthe-deep)] shadow-[inset_4px_4px_10px_rgba(80,97,71,0.12),inset_-4px_-4px_10px_rgba(255,255,237,0.8)]">
          pengaturan akun
        </p>
        <h1 className="font-[var(--font-display)] text-5xl font-semibold leading-[0.94] tracking-[-0.07em] sm:text-6xl">
          Kelola profil dasar.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          Data ini dibaca dari sesi backend. Edit profil dan ganti password bisa
          ditambahkan setelah endpoint update profil dipastikan stabil.
        </p>
      </div>

      <section className="clay-panel rounded-[2.4rem] p-6">
        <h2 className="font-[var(--font-display)] text-4xl font-semibold tracking-[-0.06em]">
          Informasi akun
        </h2>

        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            ["Nama", user.name],
            ["Email", user.email],
            [
              "Role",
              user.role?.name ?? (user.is_superadmin ? "Superadmin" : "User"),
            ],
            ["Status", user.status === false ? "Tidak aktif" : "Aktif"],
            ["User ID", user.id],
            ["Password diperbarui", formatDate(user.last_updated_password)],
          ].map(([label, value]) => (
            <div key={label} className="clay-inset rounded-[1.5rem] p-4">
              <dt className="text-xs font-black uppercase tracking-[0.18em] text-[var(--muted)]">
                {label}
              </dt>
              <dd className="mt-2 break-words font-black">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </section>
  );
}
