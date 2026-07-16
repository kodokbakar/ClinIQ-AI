"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser, type AuthUser } from "../_lib/auth-api";
import {
  getMyAttempts,
  type PaginationMetadata,
  type QuizAttemptHistory,
} from "../_lib/quiz-api";
import "./dashboard-home.css";

import { DashboardHistory } from "../_components/dashboard/dashboard-history";

const scoreFormatter = new Intl.NumberFormat("id-ID");
const HISTORY_PAGE_SIZE = 3;

type DashboardStats = {
  total: number;
  correct: number;
  score: number;
  winrate: number;
};

type DashboardState = {
  user: AuthUser;
  attempts: QuizAttemptHistory[];
  stats: DashboardStats;
  currentPage: number;
  totalPages: number;
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

function getRoleName(user: AuthUser): string {
  return user.role?.name ?? (user.is_superadmin ? "Superadmin" : "User");
}

function buildDashboardStats(
  attempts: QuizAttemptHistory[],
  metadata?: PaginationMetadata,
): DashboardStats {
  const recentCompleted = attempts.filter(
    (attempt) => attempt.is_correct !== null,
  );

  const total = metadata?.total_row ?? attempts.length;
  const completed = metadata?.completed_attempts ?? recentCompleted.length;
  const correct =
    metadata?.correct_attempts ??
    recentCompleted.filter((attempt) => attempt.is_correct).length;
  const score =
    metadata?.total_score ??
    attempts.reduce((sum, attempt) => sum + (attempt.score ?? 0), 0);

  return {
    total,
    correct,
    score,
    winrate: completed > 0 ? Math.round((correct / completed) * 100) : 0,
  };
}

function latestAttemptLabel(attempts: QuizAttemptHistory[]): string {
  const latest = attempts[0];

  if (!latest) return "Belum ada percobaan";
  if (latest.is_correct === null) return "Kasus belum selesai";
  if (latest.is_correct) return "Jawaban benar";

  return "Butuh review ulang";
}

export default function DashboardPage() {
  const { replace } = useRouter();
  const [state, setState] = useState<DashboardState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const user = await getCurrentUser();
        const attemptsResult = await getMyAttempts(HISTORY_PAGE_SIZE, 1).catch(
          () => ({
            data: [],
            metadata: undefined,
          }),
        );

        if (!isMounted) return;

        setState({
          user,
          attempts: attemptsResult.data,
          stats: buildDashboardStats(
            attemptsResult.data,
            attemptsResult.metadata,
          ),
          currentPage: attemptsResult.metadata?.current_page ?? 1,
          totalPages: attemptsResult.metadata?.total_page ?? 1,
        });
      } catch {
        replace("/login");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [replace]);

  async function handleLoadMore() {
    if (!state || isLoadingMore || state.currentPage >= state.totalPages) {
      return;
    }

    const nextPage = state.currentPage + 1;

    try {
      setHistoryError("");
      setIsLoadingMore(true);

      const result = await getMyAttempts(HISTORY_PAGE_SIZE, nextPage);

      setState((current) => {
        if (!current) return current;

        const existingIds = new Set(
          current.attempts.map((attempt) => attempt.id),
        );

        const newAttempts = result.data.filter(
          (attempt) => !existingIds.has(attempt.id),
        );

        return {
          ...current,
          attempts: [...current.attempts, ...newAttempts],
          currentPage: result.metadata?.current_page ?? nextPage,
          totalPages: result.metadata?.total_page ?? current.totalPages,
        };
      });
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Riwayat tambahan gagal dimuat.",
      );
    } finally {
      setIsLoadingMore(false);
    }
  }

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

  const { user, attempts, stats, currentPage, totalPages } = state;
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

      <DashboardHistory
        attempts={attempts}
        totalAttempts={stats.total}
        hasMore={currentPage < totalPages}
        isLoadingMore={isLoadingMore}
        error={historyError}
        onLoadMore={handleLoadMore}
      />
    </section>
  );
}
