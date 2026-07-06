import type { InputHTMLAttributes } from "react";

type AuthFieldProps = {
  label: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>;

export function AuthField({ label, error, id, ...props }: AuthFieldProps) {
  const inputId = id ?? props.name;
  const errorId = error && inputId ? `${inputId}-error` : undefined;

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className="block text-sm font-black text-[var(--ink)]"
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={errorId}
        className="focus-clay w-full rounded-[1.25rem] border border-[rgba(86,71,45,0.08)] bg-[rgba(238,226,201,0.74)] px-5 py-4 text-base font-bold text-[var(--ink)] shadow-[inset_7px_7px_16px_rgba(99,80,52,0.18),inset_-7px_-7px_16px_rgba(255,252,237,0.82)] outline-none placeholder:text-[rgba(112,104,86,0.62)]"
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-sm font-extrabold text-[var(--fig)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
