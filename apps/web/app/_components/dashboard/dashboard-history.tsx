"use client";

import { useState } from "react";
import type { QuizAttemptHistory } from "../../_lib/quiz-api";
import { DashboardHistoryModal } from "./dashboard-history-modal";
import "./dashboard-history.css";

const scoreFormatter = new Intl.NumberFormat("id-ID");

type DashboardHistoryProps = {
  attempts: QuizAttemptHistory[];
  totalAttempts: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  error: string;
  onLoadMore: () => void;
};

function formatDate(value?: string | null): string {
  if (!value) return "Belum ada aktivitas";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function getAttemptStatus(attempt: QuizAttemptHistory): string {
  if (attempt.is_correct === null) {
    return "Pending";
  }

  return attempt.is_correct ? "Correct" : "Incorrect";
}

export function DashboardHistory({
  attempts,
  totalAttempts,
  hasMore,
  isLoadingMore,
  error,
  onLoadMore,
}: DashboardHistoryProps) {
  const [selectedAttempt, setSelectedAttempt] =
    useState<QuizAttemptHistory | null>(null);

  return (
    <>
      <section className="diagnostic-panel dashboard-history">
        <div className="dashboard-history__header">
          <div>
            <p className="diagnostic-eyebrow">recent attempts</p>
            <h2>Riwayat latihan terakhir.</h2>
          </div>

          <div
            className="dashboard-history__summary"
            aria-label="Jumlah riwayat yang ditampilkan"
          >
            <strong>{attempts.length}</strong>
            <span>dari {totalAttempts}</span>
          </div>
        </div>

        {attempts.length > 0 ? (
          <>
            <div className="attempt-table" aria-live="polite">
              {attempts.map((attempt) => {
                const isCompleted = attempt.is_correct !== null;
                const diseaseName =
                  attempt.disease_name ?? "Kasus belum selesai";

                return (
                  <button
                    key={attempt.id}
                    type="button"
                    className="attempt-row"
                    disabled={!isCompleted}
                    aria-label={
                      isCompleted ? `Lihat detail ${diseaseName}` : undefined
                    }
                    title={
                      isCompleted
                        ? "Lihat detail penyakit"
                        : "Selesaikan kasus untuk melihat detail"
                    }
                    onClick={() => {
                      if (isCompleted) {
                        setSelectedAttempt(attempt);
                      }
                    }}
                  >
                    <div>
                      <strong>{diseaseName}</strong>

                      <span>
                        {attempt.disease_icd ?? "ICD pending"} ·{" "}
                        {formatDate(attempt.attempt_date)}
                      </span>
                    </div>

                    <div className="attempt-row__result">
                      <span>{getAttemptStatus(attempt)}</span>

                      <strong>
                        {scoreFormatter.format(attempt.score ?? 0)} pts
                      </strong>
                    </div>
                  </button>
                );
              })}
            </div>

            {hasMore ? (
              <div className="dashboard-history__footer">
                <button
                  type="button"
                  className="dashboard-history__load-more"
                  disabled={isLoadingMore}
                  onClick={onLoadMore}
                >
                  {isLoadingMore ? "Memuat..." : "Tampilkan lainnya"}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="diagnostic-empty">
            <strong>Belum ada attempt.</strong>
            <p>
              Mulai dari daily quiz atau random quiz untuk membangun riwayat.
            </p>
          </div>
        )}

        {error ? (
          <p role="alert" className="dashboard-history__error">
            {error}
          </p>
        ) : null}
      </section>

      <DashboardHistoryModal
        attempt={selectedAttempt}
        onClose={() => setSelectedAttempt(null)}
      />
    </>
  );
}
