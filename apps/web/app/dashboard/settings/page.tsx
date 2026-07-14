"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser, type AuthUser } from "../../_lib/auth-api";
import "./settings.css";

function formatDate(value?: string | null): string {
  if (!value) return "Belum pernah diperbarui";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getRoleName(user: AuthUser): string {
  return user.role?.name ?? (user.is_superadmin ? "Superadmin" : "User");
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
      <section className="diagnostic-panel diagnostic-loading">
        <p className="diagnostic-eyebrow">Memuat pengaturan</p>
        <h1>Mengambil profil...</h1>
      </section>
    );
  }

  if (!user) return null;

  const roleName = getRoleName(user);

  return (
    <section className="dashboard-grid">
      <div className="diagnostic-hero diagnostic-hero--compact">
        <div>
          <p className="diagnostic-eyebrow">account record</p>
          <h1>Profil belajar dan sesi.</h1>
          <p>
            Data ini dibaca dari sesi backend. Untuk sekarang dashboard hanya
            menampilkan profil; edit profil bisa ditambahkan setelah endpoint
            update tersedia.
          </p>
        </div>
      </div>

      <section className="diagnostic-panel">
        <div className="diagnostic-section-head">
          <div>
            <p className="diagnostic-eyebrow">identity</p>
            <h2>Informasi akun.</h2>
          </div>
        </div>

        <dl className="settings-record-grid">
          {[
            ["Nama", user.name],
            ["Email", user.email],
            ["Role", roleName],
            ["Status", user.status === false ? "Tidak aktif" : "Aktif"],
            ["User ID", user.id],
            ["Password diperbarui", formatDate(user.last_updated_password)],
          ].map(([label, value]) => (
            <div key={label} className="settings-record">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </section>
  );
}
