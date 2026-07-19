"use client";

import { useEffect, useState } from "react";
import {
  getAttemptDetail,
  type AIExplanation,
  type QuizAttemptDetail,
  type QuizAttemptHistory,
} from "../../_lib/quiz-api";

type DashboardHistoryModalProps = {
  attempt: QuizAttemptHistory | null;
  onClose: () => void;
};

function ExplanationList({
  title,
  items,
}: {
  title: string;
  items?: string[] | null;
}) {
  if (!items?.length) return null;

  return (
    <article className="history-modal__explanation-card">
      <span>{title}</span>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function ExplanationContent({
  explanation,
}: {
  explanation: AIExplanation | null;
}) {
  if (!explanation) {
    return (
      <p className="history-modal__empty">
        Penjelasan AI belum tersedia untuk penyakit ini.
      </p>
    );
  }

  return (
    <div className="history-modal__explanation">
      {explanation.overview ? (
        <article className="history-modal__explanation-card">
          <span>Overview</span>
          <p>{explanation.overview}</p>
        </article>
      ) : null}

      {explanation.pathophysiology ? (
        <article className="history-modal__explanation-card">
          <span>Patofisiologi</span>
          <p>{explanation.pathophysiology}</p>
        </article>
      ) : null}

      <ExplanationList
        title="Fitur klinis"
        items={explanation.clinical_features}
      />
      <ExplanationList title="Diagnosis" items={explanation.diagnosis} />
      <ExplanationList title="Tatalaksana" items={explanation.management} />
      <ExplanationList title="Pencegahan" items={explanation.prevention} />
      <ExplanationList title="Poin penting" items={explanation.key_points} />
    </div>
  );
}

export function DashboardHistoryModal({
  attempt,
  onClose,
}: DashboardHistoryModalProps) {
  const [detail, setDetail] = useState<QuizAttemptDetail | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!attempt) {
      setDetail(null);
      setError("");
      return;
    }

    const controller = new AbortController();

    setDetail(null);
    setError("");
    setIsLoading(true);

    getAttemptDetail(attempt.id, controller.signal)
      .then(setDetail)
      .catch((requestError) => {
        if (
          requestError instanceof Error &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Detail riwayat gagal dimuat.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [attempt]);

  useEffect(() => {
    if (!attempt) return;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;

      document.removeEventListener("keydown", handleEscape);
    };
  }, [attempt, onClose]);

  if (!attempt) return null;

  const modalTitle =
    detail?.disease.name ?? attempt.disease_name ?? "Detail riwayat";

  return (
    <div
      className="history-modal-backdrop fixed inset-0 z-50 grid place-items-center p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-modal-title"
        aria-busy={isLoading}
        className="history-modal w-full max-w-3xl"
      >
        <header className="history-modal__header">
          <div>
            <p className="diagnostic-eyebrow">disease review</p>
            <h2 id="history-modal-title">{modalTitle}</h2>

            {detail ? (
              <p>
                {detail.disease.icd_code} · {detail.variant_name}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            className="history-modal__close"
            aria-label="Tutup detail riwayat"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        {isLoading ? (
          <p role="status" className="history-modal__state">
            Memuat detail penyakit...
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="history-modal__error">
            {error}
          </p>
        ) : null}

        {detail ? (
          <div className="history-modal__content">
            <dl className="history-modal__summary">
              <div>
                <dt>Hasil</dt>
                <dd>
                  {detail.is_correct
                    ? "Diagnosis tepat"
                    : "Diagnosis belum tepat"}
                </dd>
              </div>

              <div>
                <dt>Jawabanmu</dt>
                <dd>{detail.submitted_diagnosis ?? "Tidak tersedia"}</dd>
              </div>

              <div>
                <dt>Score</dt>
                <dd>{detail.score ?? 0} pts</dd>
              </div>

              <div>
                <dt>Clue terbuka</dt>
                <dd>{detail.clues_revealed}</dd>
              </div>
            </dl>

            {detail.disease.description ? (
              <section className="history-modal__section">
                <h3>Tentang penyakit</h3>
                <p>{detail.disease.description}</p>
              </section>
            ) : null}

            <section className="history-modal__section">
              <h3>Clue kasus</h3>

              <ol className="history-modal__clues">
                {detail.clues.map((clue) => (
                  <li key={clue.clue_number}>
                    <span>
                      Clue {clue.clue_number}
                      {clue.type ? ` · ${clue.type}` : ""}
                    </span>
                    <p>{clue.content}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="history-modal__section">
              <h3>Penjelasan klinis</h3>
              <ExplanationContent explanation={detail.explanation} />
            </section>
          </div>
        ) : null}
      </section>
    </div>
  );
}
