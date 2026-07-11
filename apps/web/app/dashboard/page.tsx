"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCurrentUser, type AuthUser } from "../_lib/auth-api";
import { getMyAttempts, type QuizAttemptHistory } from "../_lib/quiz-api";
import "./dashboard-home.css";

const scoreFormatter = new Intl.NumberFormat("id-ID");

type DashboardState = {
  user: AuthUser;
  attempts: QuizAttemptHistory[];
  totalAttempts: number;
};

const quizActions = [
  {
    href: "/quiz?mode=daily",
    label: "Daily Quiz",
    eyebrow: "resume today",
    copy: "Lanjutkan atau mulai kasus harian dari backend.",
  },
  {
    href: "/quiz?mode=random",
    label: "Random Quiz",
    eyebrow: "new case",
    copy: "Ambil vignette acak yang belum pernah kamu kerjakan.",
  },
  {
    href: "/groups/join",
    label: "Join Group",
    eyebrow: "study circle",
    copy: "Masuk ke grup belajar untuk leaderboard dan latihan bersama.",
  },
];

function formatDate(value?: string | null): string {
  if (!value) return "Belum ada aktivitas";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getRoleName(user: AuthUser): string {
  return user.role?.name ?? (user.is_superadmin ? "Superadmin" : "User");
}

function completedAttempts(attempts: QuizAttemptHistory[]) {
  return attempts.filter((attempt) => attempt.is_correct !== null);
}

function latestAttemptLabel(attempts: QuizAttemptHistory[]): string {
  const latest = attempts[0];

  if (!latest) return "Belum ada percobaan";
  if (latest.is_correct === null) return "Kasus belum selesai";
  if (latest.is_correct) return "Jawaban benar";

  return "Butuh review ulang";
}

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<DashboardState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const user = await getCurrentUser();
        const attemptsResult = await getMyAttempts(5).catch(() => ({
          data: [],
          metadata: undefined,
        }));

        if (!isMounted) return;

        setState({
          user,
          attempts: attemptsResult.data,
          totalAttempts:
            attemptsResult.metadata?.total_row ?? attemptsResult.data.length,
        });
      } catch {
        router.replace("/login");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const stats = useMemo(() => {
    const attempts = state?.attempts ?? [];
    const completed = completedAttempts(attempts);
    const correct = completed.filter((attempt) => attempt.is_correct).length;
    const total = state?.totalAttempts ?? 0;
    const score = attempts.reduce(
      (sum, attempt) => sum + (attempt.score ?? 0),
      0,
    );

    return {
      total,
      correct,
      score,
      winrate: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  }, [state]);

  if (isLoading) {
    return (
      <section className="diagnostic-panel diagnostic-loading">
        <p className="diagnostic-eyebrow">Memuat dashboard</p>
        <h1>Menyiapkan study desk...</h1>
      </section>
    );
  }

  if (!state) {
    return (
      <section className="diagnostic-panel diagnostic-loading">
        <h1>Mengarahkan ke halaman masuk.</h1>
      </section>
    );
  }

  const { user, attempts } = state;
  const roleName = getRoleName(user);

  return (
    <section className="dashboard-grid">
      <div className="diagnostic-hero">
        <div>
          <p className="diagnostic-eyebrow">diagnostic study desk</p>
          <h1>Halo, {user.name}. Latih cara membaca petunjuk klinis.</h1>
          <p>
            Dashboard ini fokus ke kebiasaan berpikir: amati clue, susun
            hipotesis, jawab diagnosis, lalu pakai penjelasan AI untuk memahami
            kenapa jawabanmu tepat atau meleset.
          </p>
        </div>

        <div className="diagnostic-profile-card" aria-label="Profil belajar">
          <span>{user.name.slice(0, 1).toUpperCase()}</span>
          <strong>{roleName}</strong>
          <small>{user.email}</small>
        </div>
      </div>

      <div className="diagnostic-stat-grid">
        {[
          ["Total Attempts", scoreFormatter.format(stats.total)],
          ["Correct Cases", scoreFormatter.format(stats.correct)],
          ["Win Rate", `${stats.winrate}%`],
          ["Score", scoreFormatter.format(stats.score)],
        ].map(([label, value]) => (
          <article className="diagnostic-stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="dashboard-columns">
        <section id="daily-case" className="diagnostic-panel action-hub">
          <div className="diagnostic-section-head">
            <div>
              <p className="diagnostic-eyebrow">choose your next move</p>
              <h2>Mulai latihan atau masuk grup belajar.</h2>
            </div>
          </div>

          <div className="dashboard-action-grid">
            {quizActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="dashboard-action-card"
              >
                <span>{action.eyebrow}</span>
                <strong>{action.label}</strong>
                <p>{action.copy}</p>
              </Link>
            ))}
          </div>
        </section>

        <aside className="diagnostic-panel">
          <p className="diagnostic-eyebrow">learning pulse</p>
          <h2 className="diagnostic-side-title">
            {latestAttemptLabel(attempts)}
          </h2>

          <div className="learning-flow" aria-label="Alur belajar">
            {[
              "Read clue",
              "Form hypothesis",
              "Submit diagnosis",
              "Study AI note",
            ].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </aside>
      </div>

      <section className="diagnostic-panel">
        <div className="diagnostic-section-head">
          <div>
            <p className="diagnostic-eyebrow">recent attempts</p>
            <h2>Riwayat latihan terakhir.</h2>
          </div>
        </div>

        {attempts.length > 0 ? (
          <div className="attempt-table">
            {attempts.map((attempt) => (
              <article className="attempt-row" key={attempt.id}>
                <div>
                  <strong>
                    {attempt.disease_name ?? "Kasus belum selesai"}
                  </strong>
                  <span>
                    {attempt.disease_icd ?? "ICD pending"} ·{" "}
                    {formatDate(attempt.attempt_date)}
                  </span>
                </div>
                <div>
                  <span>
                    {attempt.is_correct === null
                      ? "Pending"
                      : attempt.is_correct
                        ? "Correct"
                        : "Incorrect"}
                  </span>
                  <strong>
                    {scoreFormatter.format(attempt.score ?? 0)} pts
                  </strong>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="diagnostic-empty">
            <strong>Belum ada attempt.</strong>
            <p>
              Mulai dari daily quiz atau random quiz untuk membangun riwayat.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
