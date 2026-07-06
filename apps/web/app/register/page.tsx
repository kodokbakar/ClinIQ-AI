import type { Metadata } from "next";
import { AuthShell } from "../_components/auth/auth-shell";
import { RegisterForm } from "../_components/auth/register-form";

export const metadata: Metadata = {
  title: "Daftar — clinIQ AI",
  description: "Buat workspace baru di clinIQ AI.",
};

export default function RegisterPage() {
  return (
    <AuthShell
      eyebrow="workspace baru"
      title="Bentuk klinik digital yang terasa manusiawi."
      description="Buat akses awal untuk mulai merapikan intake pasien, catatan triase, dan ringkasan kunjungan dengan alur yang lebih lembut."
      alternateText="Sudah punya akun?"
      alternateHref="/login"
      alternateLabel="Masuk sekarang"
    >
      <RegisterForm />
    </AuthShell>
  );
}
