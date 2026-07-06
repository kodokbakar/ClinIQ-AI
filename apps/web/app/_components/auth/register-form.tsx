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
  } else if (name.length < 2) {
    errors.name = "Nama minimal 2 karakter.";
  }

  if (!email) {
    errors.email = "Email tidak boleh kosong.";
  } else if (!isValidEmail(email)) {
    errors.email = "Format email tidak valid.";
  }

  if (!password) {
    errors.password = "Password tidak boleh kosong.";
  } else if (password.length < 8) {
    errors.password = "Password minimal 8 karakter.";
  } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.password =
      "Password harus mengandung huruf kecil, huruf besar, dan angka.";
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

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      await registerUser({
        name,
        email,
        password,
        confirm_password: confirmPassword,
      });
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
      className="space-y-5"
      noValidate
    >
      {errors.form ? (
        <div
          role="alert"
          className="rounded-[1.25rem] border border-[rgba(123,99,118,0.24)] bg-[rgba(201,183,195,0.35)] px-5 py-4 text-sm font-extrabold text-[var(--ink)]"
        >
          {errors.form}
        </div>
      ) : null}

      <AuthField
        label="Nama lengkap"
        name="name"
        type="text"
        autoComplete="name"
        placeholder="dr. Maya Raharja"
        error={errors.name}
      />

      <AuthField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="nama@klinik.id"
        error={errors.email}
      />

      <AuthField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Minimal 8 karakter"
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="focus-clay clay-button inline-flex w-full items-center justify-center rounded-full bg-[var(--fig)] px-7 py-4 text-base font-black text-[var(--cream)] disabled:cursor-not-allowed disabled:opacity-65"
      >
        {isSubmitting ? "Membuat workspace..." : "Daftar workspace"}
      </button>
    </form>
  );
}
