import Link from "next/link";
import type { ReactNode } from "react";

type AuthVariant = "login" | "register";

type AuthShellProps = {
  variant: AuthVariant;
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  alternateText: string;
  alternateHref: string;
  alternateLabel: string;
};

const signals = [
  { label: "Cases", value: "ICD" },
  { label: "Clues", value: "3–5" },
  { label: "Feedback", value: "AI" },
];

const clues = [
  {
    label: "Clue 01",
    text: "Demam tinggi muncul mendadak dan disertai nyeri otot berat.",
  },
  {
    label: "Clue 02",
    text: "Pasien mengeluh sakit kepala, mual, dan ruam halus.",
  },
  {
    label: "Clue 03",
    text: "Jawabanmu diuji, lalu AI menjelaskan pola klinisnya.",
  },
];

export function AuthShell({
  variant,
  eyebrow,
  title,
  description,
  children,
  alternateText,
  alternateHref,
  alternateLabel,
}: AuthShellProps) {
  return (
    <main className={`auth-screen auth-screen--${variant}`}>
      <div className="auth-page">
        <section className="auth-panel" aria-labelledby="auth-title">
          <div>
            <Link
              href="/"
              className="auth-brand"
              aria-label="Kembali ke beranda clinIQ AI"
            >
              <span className="auth-brand__mark">cQ</span>
              <span>
                <span className="auth-brand__name">clinIQ AI</span>
                <span className="auth-brand__tag">diagnostic quiz</span>
              </span>
            </Link>

            <div className="auth-copy">
              <p className="auth-eyebrow">{eyebrow}</p>
              <h1 id="auth-title" className="auth-title">
                {title}
              </h1>
              <p className="auth-description">{description}</p>
            </div>
          </div>

          <div className="auth-form-wrap">
            {children}

            <p className="auth-alternate">
              {alternateText}{" "}
              <Link href={alternateHref} className="auth-alternate__link">
                {alternateLabel}
              </Link>
            </p>
          </div>
        </section>

        <aside className="auth-poster" aria-label="Pratinjau latihan diagnosis">
          <div className="auth-poster__top">
            <p className="auth-poster__label">clinical reasoning board</p>
            <span className="auth-poster__badge">learn by clues</span>
          </div>

          <div className="auth-poster__body">
            <h2 className="auth-poster__title">
              Read <span>clues</span>. Think. Answer.
            </h2>

            <div className="auth-clue-board">
              <div className="auth-case-card">
                {clues.map((clue) => (
                  <div className="auth-clue" key={clue.label}>
                    <span className="auth-clue__label">{clue.label}</span>
                    <p className="auth-clue__text">{clue.text}</p>
                  </div>
                ))}
              </div>

              <div className="auth-ai-card">
                <span className="auth-ai-card__mark">AI</span>
                <h3 className="auth-ai-card__title">
                  Explanation after attempt.
                </h3>
                <p className="auth-ai-card__copy">
                  Benar atau salah, siswa tetap mendapat alasan klinis yang bisa
                  dipelajari.
                </p>
              </div>
            </div>

            <div className="auth-signal-list" aria-label="Fitur utama">
              {signals.map((signal) => (
                <div className="auth-signal" key={signal.label}>
                  <span className="auth-signal__label">{signal.label}</span>
                  <span className="auth-signal__value">{signal.value}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
