"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { registerUser } from "../../_lib/auth-api";
import { isValidEmail } from "../../_lib/auth-validation";
import { AuthField } from "./auth-field";

type RegisterErrors = Partial<
  Record<"name" | "email" | "password" | "confirm_password" | "form", string>
>;

function validateRegister(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
): RegisterErrors {
  const errors: RegisterErrors = {};

  if (!name) {
    errors.name = "Nama tidak boleh kosong.";
  }

  if (!email) {
    errors.email = "Email tidak boleh kosong.";
  } else if (!isValidEmail(email)) {
    errors.email = "Format email tidak valid.";
  }

  if (!password) {
    errors.password = "Password tidak boleh kosong.";
  } else if (password.length < 6) {
    errors.password = "Password minimal 6 karakter.";
  }

  if (!confirmPassword) {
    errors.confirm_password = "Konfirmasi password tidak boleh kosong.";
  } else if (password !== confirmPassword) {
    errors.confirm_password = "Konfirmasi password tidak cocok.";
  }

  return errors;
}

export function RegisterForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

    const validationErrors = validateRegister(
      name,
      email,
      password,
      confirmPassword,
    );
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    try {
      setIsSubmitting(true);
      await registerUser({ name, email, password });
      router.push("/login?registered=1");
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : "Registrasi gagal. Silakan coba lagi.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      data-testid="register-form"
      onSubmit={handleSubmit}
      className="auth-form"
      noValidate
    >
      {errors.form ? (
        <div role="alert" className="auth-alert">
          {errors.form}
        </div>
      ) : null}

      <AuthField
        label="Nama lengkap"
        name="name"
        type="text"
        autoComplete="name"
        placeholder="Ari Purnama"
        error={errors.name}
      />

      <AuthField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="ari@email.com"
        error={errors.email}
      />

      <AuthField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Minimal 6 karakter"
        error={errors.password}
      />

      <AuthField
        label="Konfirmasi password"
        name="confirm_password"
        type="password"
        autoComplete="new-password"
        placeholder="Ulangi password"
        error={errors.confirm_password}
      />

      <button type="submit" disabled={isSubmitting} className="auth-submit">
        {isSubmitting ? "Membuat akun..." : "Buat akun belajar"}
      </button>
    </form>
  );
}
