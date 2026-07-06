import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  alternateText: string;
  alternateHref: string;
  alternateLabel: string;
};

const signals = [
  { label: "Catatan intake", value: "siap tinjau" },
  { label: "Keamanan sesi", value: "cookie httpOnly" },
  { label: "Mode klinik", value: "tenang" },
];

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  alternateText,
  alternateHref,
  alternateLabel,
}: AuthShellProps) {
  return (
    <main className="relative isolate min-h-svh overflow-hidden px-5 py-5 sm:px-8 lg:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-28 top-16 -z-10 h-80 w-80 rounded-[44%_56%_61%_39%/47%_39%_61%_53%] bg-[var(--fig-soft)] opacity-35 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 bottom-10 -z-10 h-96 w-96 rounded-[60%_40%_43%_57%/43%_57%_43%_57%] bg-[var(--absinthe)] opacity-35 blur-3xl"
      />

      <div className="mx-auto grid min-h-[calc(100svh-2.5rem)] w-full max-w-6xl items-center gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="clay-panel rounded-[2.4rem] p-6 sm:p-8 lg:p-10">
          <Link
            href="/"
            className="focus-clay mb-10 inline-flex items-center gap-3 rounded-full"
            aria-label="Kembali ke beranda clinIQ AI"
          >
            <span className="grid size-11 place-items-center rounded-[1.1rem] bg-[var(--ink)] text-sm font-black text-[var(--cream)] shadow-[7px_8px_18px_rgba(69,55,36,0.26)]">
              cQ
            </span>
            <span className="leading-none">
              <span className="block font-[var(--font-display)] text-xl font-semibold tracking-[-0.04em]">
                clinIQ AI
              </span>
              <span className="block text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted)]">
                clinical clayware
              </span>
            </span>
          </Link>

          <p className="mb-5 inline-flex rounded-full bg-[rgba(154,170,131,0.34)] px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[var(--absinthe-deep)] shadow-[inset_4px_4px_10px_rgba(80,97,71,0.12),inset_-4px_-4px_10px_rgba(255,255,237,0.8)]">
            {eyebrow}
          </p>

          <h1 className="font-[var(--font-display)] text-5xl font-semibold leading-[0.94] tracking-[-0.07em] text-[var(--ink)] sm:text-6xl">
            {title}
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--muted)]">
            {description}
          </p>

          <div className="mt-8">{children}</div>

          <p className="mt-7 text-sm font-bold text-[var(--muted)]">
            {alternateText}{" "}
            <Link
              href={alternateHref}
              className="focus-clay rounded-full font-black text-[var(--fig)] underline decoration-[rgba(123,99,118,0.35)] underline-offset-4 transition hover:text-[var(--ink)]"
            >
              {alternateLabel}
            </Link>
          </p>
        </section>

        <aside
          aria-label="Pratinjau ruang kerja klinik"
          className="clay-panel hidden min-h-[38rem] overflow-hidden rounded-[2.4rem] p-6 lg:block"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--muted)]">
                clinical desk
              </p>
              <h2 className="font-[var(--font-display)] text-4xl font-semibold tracking-[-0.06em]">
                Ruang kerja yang terasa lembut, bukan rapuh.
              </h2>
            </div>
            <span className="clay-inset rounded-full px-4 py-2 text-sm font-black text-[var(--absinthe-deep)]">
              aman
            </span>
          </div>

          <div className="mt-8 rounded-[2rem] bg-[var(--ink)] p-5 text-[var(--cream)] shadow-[14px_18px_35px_rgba(49,39,26,0.28)]">
            <p className="text-sm font-extrabold text-[rgba(255,248,234,0.7)]">
              Ringkasan masuk
            </p>
            <p className="mt-5 font-[var(--font-display)] text-4xl font-semibold leading-tight tracking-[-0.06em]">
              “Pasien datang dengan keluhan utama yang sudah dirapikan sebelum
              konsultasi.”
            </p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {["Identitas", "Keluhan", "Riwayat"].map((item) => (
                <span
                  key={item}
                  className="rounded-full bg-[rgba(255,248,234,0.1)] px-3 py-2 text-center text-xs font-black text-[rgba(255,248,234,0.82)]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {signals.map((signal) => (
              <div
                key={signal.label}
                className="clay-inset flex items-center justify-between rounded-[1.5rem] p-4"
              >
                <span className="font-extrabold text-[var(--muted)]">
                  {signal.label}
                </span>
                <span className="font-black text-[var(--fig)]">
                  {signal.value}
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
