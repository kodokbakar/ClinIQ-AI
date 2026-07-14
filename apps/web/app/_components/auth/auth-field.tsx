import type { InputHTMLAttributes } from "react";

type AuthFieldProps = {
  label: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function AuthField({ label, error, id, ...props }: AuthFieldProps) {
  const inputId = id ?? props.name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;

  return (
    <div className="auth-field">
      <label htmlFor={inputId} className="auth-field__label">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className="auth-field__input"
        {...props}
      />
      {error ? (
        <p id={errorId} className="auth-field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
