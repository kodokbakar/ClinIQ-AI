import type { Metadata } from "next";
import { AuthShell } from "../_components/auth/auth-shell";
import { LoginForm } from "../_components/auth/login-form";
import "../_components/auth/auth.css";
import "./login.css";

export const metadata: Metadata = {
  title: "Masuk — clinIQ AI",
  description: "Masuk ke ruang belajar diagnosis clinIQ AI.",
};

export default function LoginPage() {
  return (
    <AuthShell
      variant="login"
      eyebrow="diagnostic access"
      title="Masuk ke ruang diagnosis."
      description="Lanjutkan latihan membaca clue klinis, pilih dugaan penyakit, lalu pelajari alasan AI saat jawabanmu benar atau meleset."
      alternateText="Belum punya akun?"
      alternateHref="/register"
      alternateLabel="Buat akun belajar"
    >
      <LoginForm />
    </AuthShell>
  );
}
