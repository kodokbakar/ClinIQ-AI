"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import {
  changePassword,
  getCurrentUser,
  type AuthUser,
} from "../../_lib/auth-api";
import "./settings.css";

const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

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
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

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

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    if (!oldPassword) {
      setPasswordError("Password lama tidak boleh kosong.");
      return;
    }

    if (!newPassword) {
      setPasswordError("Password baru tidak boleh kosong.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password baru minimal 8 karakter.");
      return;
    }

    if (!STRONG_PASSWORD_PATTERN.test(newPassword)) {
      setPasswordError(
        "Password baru harus mengandung huruf kecil, huruf besar, dan angka.",
      );
      return;
    }

    if (newPassword === oldPassword) {
      setPasswordError("Password baru harus berbeda dari password lama.");
      return;
    }

    if (!confirmPassword) {
      setPasswordError("Konfirmasi password tidak boleh kosong.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Password baru dan konfirmasi password tidak cocok.");
      return;
    }

    try {
      setIsChangingPassword(true);

      const result = await changePassword({
        oldPassword,
        newPassword,
        confirmPassword,
      });

      setUser((current) =>
        current
          ? {
              ...current,
              last_updated_password: result.changed_at,
            }
          : current,
      );

      setPasswordSuccess("Password berhasil diubah.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Gagal mengubah password.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

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

      <section className="diagnostic-panel">
        <div className="diagnostic-section-head">
          <div>
            <p className="diagnostic-eyebrow">security</p>
            <h2>Ubah password.</h2>
          </div>
        </div>

        <form
          onSubmit={handleChangePassword}
          className="settings-form grid gap-4"
          noValidate
        >
          {passwordSuccess ? (
            <p role="status" className="settings-form__success">
              {passwordSuccess}
            </p>
          ) : null}
          {passwordError ? (
            <p role="alert" className="settings-form__error">
              {passwordError}
            </p>
          ) : null}

          <div className="grid gap-2">
            <label htmlFor="old-password">Password lama</label>
            <input
              id="old-password"
              name="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(event) => setOldPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Masukkan password saat ini"
              disabled={isChangingPassword}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="new-password">Password baru</label>
            <input
              id="new-password"
              name="newPassword"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Minimal 8 karakter"
              disabled={isChangingPassword}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="confirm-password">Konfirmasi password baru</label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              placeholder="Ulangi password baru"
              disabled={isChangingPassword}
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="settings-form__submit"
          >
            {isChangingPassword ? "Mengubah..." : "Simpan perubahan"}
          </button>
        </form>
      </section>
    </section>
  );
}
