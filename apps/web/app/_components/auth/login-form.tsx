"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { loginUser } from "../../_lib/auth-api";
import { isValidEmail } from "../../_lib/auth-validation";
import { AuthField } from "./auth-field";

type LoginErrors = Partial<Record<"email" | "password" | "form", string>>;

function validateLogin(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};

  if (!email) {
    errors.email = "Email tidak boleh kosong.";
  } else if (!isValidEmail(email)) {
    errors.email = "Format email tidak valid.";
  }

  if (!password) {
    errors.password = "Password tidak boleh kosong.";
  }

  return errors;
}

export function LoginForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const validationErrors = validateLogin(email, password);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      await loginUser({ email, password });
      router.push("/dashboard");
    } catch (error) {
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : "Login gagal. Silakan coba lagi.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      data-testid="login-form"
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
        autoComplete="current-password"
        placeholder="Masukkan password"
        error={errors.password}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="focus-clay clay-button inline-flex w-full items-center justify-center rounded-full bg-[var(--fig)] px-7 py-4 text-base font-black text-[var(--cream)] disabled:cursor-not-allowed disabled:opacity-65"
      >
        {isSubmitting ? "Memeriksa sesi..." : "Masuk ke workspace"}
      </button>
    </form>
  );
}
