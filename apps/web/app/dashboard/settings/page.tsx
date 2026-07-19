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

function validatePasswordChange(
  oldPassword: string,
  newPassword: string,
  confirmPassword: string,
): string {
  if (!oldPassword) {
    return "Password lama tidak boleh kosong.";
  }

  if (!newPassword) {
    return "Password baru tidak boleh kosong.";
  }

  if (newPassword.length < 8) {
    return "Password baru minimal 8 karakter.";
  }

  if (!STRONG_PASSWORD_PATTERN.test(newPassword)) {
    return "Password baru harus mengandung huruf kecil, huruf besar, dan angka.";
  }

  if (newPassword === oldPassword) {
    return "Password baru harus berbeda dari password lama.";
  }

  if (!confirmPassword) {
    return "Konfirmasi password tidak boleh kosong.";
  }

  if (newPassword !== confirmPassword) {
    return "Password baru dan konfirmasi password tidak cocok.";
  }

  return "";
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    const validationError = validatePasswordChange(
      oldPassword,
      newPassword,
      confirmPassword,
    );

    if (validationError) {
      setPasswordError(validationError);
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

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess("Password berhasil diubah.");
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Gagal mengubah password.",
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <section className="diagnostic-panel diagnostic-loading">
        <p className="diagnostic-eyebrow">Memuat pengaturan</p>
        <h1>Mengambil profil...</h1>
      </section>
    );
  }

  if (!user) return null;

  const accountRecords = [
    ["Nama", user.name],
    ["Email", user.email],
    ["Role", getRoleName(user)],
    ["Status", user.status === false ? "Tidak aktif" : "Aktif"],
    ["User ID", user.id],
    ["Password diperbarui", formatDate(user.last_updated_password)],
  ];

  return (
    <section className="settings-page">
      <header className="settings-header">
        <div>
          <p className="diagnostic-eyebrow">account settings</p>
          <h1>Profil belajar dan sesi.</h1>
          <p>Kelola informasi akun dan keamanan password.</p>
        </div>
      </header>

      <div className="settings-layout">
        <section
          className="settings-card settings-card--account"
          aria-labelledby="account-information-title"
        >
          <header className="settings-card__header">
            <div>
              <span className="settings-card__label">identity</span>
              <h2 id="account-information-title">Informasi akun.</h2>
            </div>
          </header>

          <dl className="settings-record-grid">
            {accountRecords.map(([label, value]) => (
              <div key={label} className="settings-record">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="settings-card settings-card--security"
          aria-labelledby="change-password-title"
        >
          <header className="settings-card__header">
            <div>
              <span className="settings-card__label">security</span>
              <h2 id="change-password-title">Ubah password.</h2>
              <p>Gunakan minimal 8 karakter, huruf besar, kecil, dan angka.</p>
            </div>
          </header>

          <form
            onSubmit={handleChangePassword}
            className="settings-form"
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

            <label className="settings-field" htmlFor="old-password">
              <span>Password lama</span>
              <input
                id="old-password"
                name="oldPassword"
                type="password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Password saat ini"
                disabled={isChangingPassword}
              />
            </label>

            <label className="settings-field" htmlFor="new-password">
              <span>Password baru</span>
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
            </label>

            <label className="settings-field" htmlFor="confirm-password">
              <span>Konfirmasi password</span>
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
            </label>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="settings-form__submit"
            >
              {isChangingPassword ? "Mengubah..." : "Simpan password"}
            </button>
          </form>
        </section>
      </div>
    </section>
  );
}
