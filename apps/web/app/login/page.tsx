import type { Metadata } from "next";
import { AuthShell } from "../_components/auth/auth-shell";
import { LoginForm } from "../_components/auth/login-form";

export const metadata: Metadata = {
  title: "Masuk — clinIQ AI",
  description: "Masuk ke workspace clinIQ AI.",
};

export default function LoginPage() {
  return (
    <AuthShell
      eyebrow="akses klinik"
      title="Masuk ke ruang kerja yang lebih tenang."
      description="Lanjutkan intake pasien, tinjau draft AI, dan rapikan catatan klinis tanpa kehilangan kendali."
      alternateText="Belum punya akun?"
      alternateHref="/register"
      alternateLabel="Daftar workspace"
    >
      <LoginForm />
    </AuthShell>
  );
}
