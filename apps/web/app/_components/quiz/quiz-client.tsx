"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  getAIExplanation,
  getQuizByMode,
  isEmptyQuiz,
  searchDiseases,
  submitDiagnosis,
  type AIExplanation,
  type DiseaseSearchResult,
  type QuizAttempt,
  type QuizMode,
  type SubmitDiagnosisResult,
} from "../../_lib/quiz-api";

type QuizClientProps = {
  initialMode: QuizMode;
};

const modeCopy = {
  daily: {
    eyebrow: "daily clinical round",
    title: "Kasus harian untuk melatih pola pikir.",
    description:
      "Satu kasus per hari. Baca clue perlahan, susun hipotesis, lalu jawab diagnosis saat kamu siap.",
  },
  random: {
    eyebrow: "random diagnostic drill",
    title: "Kasus acak untuk menguji refleks klinis.",
    description:
      "Ambil vignette yang belum pernah kamu kerjakan. Cocok untuk drilling cepat dan review mandiri.",
  },
} satisfies Record<
  QuizMode,
  { eyebrow: string; title: string; description: string }
>;

function clueTypeLabel(type: string | null): string {
  return type ? type.replaceAll("_", " ") : "clinical clue";
}

function resultLabel(result: SubmitDiagnosisResult): string {
  return result.is_correct ? "Diagnosis tepat" : "Diagnosis belum tepat";
}

function resultCopy(result: SubmitDiagnosisResult): string {
  if (result.is_correct) {
    return `Jawaban benar. Kamu mendapat ${result.score} poin dengan ${result.clues_revealed} clue terbuka.`;
  }

  return `Jawabanmu belum tepat. Diagnosis yang benar adalah ${result.correct_disease?.name}. Pakai penjelasan di bawah untuk review.`;
}

function listItems(items?: string[] | null) {
  return Array.isArray(items) ? items.filter(Boolean) : [];
}

export function QuizClient({ initialMode }: QuizClientProps) {
  const { push, replace } = useRouter();
  const copy = modeCopy[initialMode];
  const [quiz, setQuiz] = useState<QuizAttempt | null>(null);
  const [isEmpty, setIsEmpty] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [suggestions, setSuggestions] = useState<DiseaseSearchResult[]>([]);
  const [selectedDisease, setSelectedDisease] =
    useState<DiseaseSearchResult | null>(null);
  const [result, setResult] = useState<SubmitDiagnosisResult | null>(null);
  const [explanation, setExplanation] = useState<AIExplanation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [error, setError] = useState("");
  const [explanationError, setExplanationError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadQuiz() {
      try {
        setError("");
        setIsLoading(true);

        let nextQuiz = await getQuizByMode(initialMode);
        let retries = 0;
        while (isEmptyQuiz(nextQuiz) && retries < 5) {
          await new Promise((r) => setTimeout(r, 3000));
          nextQuiz = await getQuizByMode(initialMode);
          retries++;
        }

        if (!isMounted) return;

        if (isEmptyQuiz(nextQuiz)) {
          setQuiz(null);
          setIsEmpty(true);
          return;
        }

        setQuiz(nextQuiz);
        setIsEmpty(false);

        if (nextQuiz.is_completed && typeof nextQuiz.is_correct === "boolean") {
          setResult({
            is_correct: nextQuiz.is_correct,
            score: nextQuiz.score ?? 0,
            clues_revealed: nextQuiz.clues_revealed,
          });
        }
      } catch (loadError) {
        if (!isMounted) return;

        if (loadError instanceof Error) {
          setError(loadError.message);
        } else {
          setError("Kasus gagal dimuat.");
        }

        replace("/login");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadQuiz();

    return () => {
      isMounted = false;
    };
  }, [initialMode, replace]);

  useEffect(() => {
    let isMounted = true;
    const query = diagnosis.trim();

    if (query.length < 2 || result) {
      setSuggestions([]);
      return;
    }

    searchDiseases(query)
      .then((items) => {
        if (isMounted) setSuggestions(items);
      })
      .catch(() => {
        if (isMounted) setSuggestions([]);
      });

    return () => {
      isMounted = false;
    };
  }, [diagnosis, result]);

  const revealedClues = useMemo(
    () => quiz?.clues.filter((clue) => clue.content) ?? [],
    [quiz],
  );

  const maxClues = quiz?.clues.length ?? 0;

  async function loadExplanation(correctDisease: string) {
    try {
      setExplanation(null);
      setExplanationError("");
      setIsLoadingExplanation(true);

      const exactDisease =
        selectedDisease?.name.toLowerCase() === correctDisease.toLowerCase()
          ? selectedDisease
          : (await searchDiseases(correctDisease, 5)).find(
              (disease) =>
                disease.name.toLowerCase() === correctDisease.toLowerCase(),
            );

      if (!exactDisease) {
        setExplanationError(
          "Penjelasan AI belum bisa dimuat untuk disease ini.",
        );
        return;
      }

      const aiExplanation = await getAIExplanation(exactDisease.id);
      setExplanation(aiExplanation);
    } catch (aiError) {
      setExplanationError(
        aiError instanceof Error
          ? aiError.message
          : "Penjelasan AI gagal dimuat.",
      );
    } finally {
      setIsLoadingExplanation(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!quiz || result) return;

    const submittedDiagnosis = diagnosis.trim();

    if (!submittedDiagnosis) {
      setError("Isi diagnosis terlebih dahulu.");
      return;
    }

    try {
      setError("");
      setIsSubmitting(true);

      const response = await submitDiagnosis({
        attempt_id: quiz.attempt_id,
        diagnosis: submittedDiagnosis,
      });

      // Case 1: Incorrect, but new clue is revealed
      if (response.clue) {
        setQuiz((current) => {
          if (!current) return current;
          return {
            ...current,
            clues_revealed: response.clues_revealed ?? current.clues_revealed,
            clues: current.clues.map((c) =>
              c.clue_number === response.clue?.clue_number
                ? { ...response.clue, is_revealed: true }
                : c
            ),
          };
        });
        // Clear input for next guess
        setDiagnosis("");
        setSelectedDisease(null);
        // Maybe a temporary toast/notification here? For now, just updates clues.
        return;
      }

      // Case 2: Final result (correct or incorrect on last clue)
      const finalResult: SubmitDiagnosisResult = {
        is_correct: response.is_correct,
        score: response.score ?? 0,
        clues_revealed: quiz.clues_revealed,
        correct_disease: response.correct_disease,
      };

      setQuiz((current) =>
        current
          ? {
              ...current,
              is_completed: true,
              is_correct: finalResult.is_correct,
              score: finalResult.score,
            }
          : current
      );
      setResult(finalResult);
      if (finalResult.correct_disease?.name) {
        await loadExplanation(finalResult.correct_disease.name);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Diagnosis gagal dikirim."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function selectDisease(disease: DiseaseSearchResult) {
    setDiagnosis(disease.name);
    setSelectedDisease(disease);
    setSuggestions([]);
  }

  async function handleNext() {
    setQuiz(null);
    setResult(null);
    setExplanation(null);
    setDiagnosis("");
    setSelectedDisease(null);
    setError("");
    setExplanationError("");
    setIsEmpty(false);
    setIsLoading(true);

    try {
      let nextQuiz = await getQuizByMode("random");
      let retries = 0;
      while (isEmptyQuiz(nextQuiz) && retries < 5) {
        await new Promise((r) => setTimeout(r, 3000));
        nextQuiz = await getQuizByMode("random");
        retries++;
      }

      if (isEmptyQuiz(nextQuiz)) {
        setQuiz(null);
        setIsEmpty(true);
        return;
      }

      setQuiz(nextQuiz);
      setIsEmpty(false);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Kasus gagal dimuat.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const isRetrying = isLoading && quiz === null && !isEmpty;

  if (isLoading) {
    return (
      <main className="quiz-screen px-3 py-3 sm:px-5 sm:py-5">
        <section className="quiz-panel quiz-loading">
          <p className="diagnostic-eyebrow">Memuat quiz</p>
          <h1>{isRetrying ? "Mengenerate pertanyaan baru, mohon tunggu..." : "Menyiapkan kasus..."}</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="quiz-screen px-3 py-3 sm:px-5 sm:py-5">
      <section className="quiz-shell">
        <header className="quiz-navbar">
          <button
            type="button"
            onClick={() => push("/dashboard")}
            className="quiz-back-button"
          >
            <span aria-hidden="true">←</span>
            Back to dashboard
          </button>

          <div className="quiz-navbar__copy">
            <p className="diagnostic-eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <p>{copy.description}</p>
          </div>

          <div className="quiz-mode-pill" aria-label="Mode quiz aktif">
            <span>mode</span>
            <strong>{initialMode}</strong>
          </div>
        </header>

        {error ? (
          <p role="alert" className="diagnostic-alert">
            {error}
          </p>
        ) : null}

        {isEmpty ? (
          <section className="quiz-panel quiz-empty">
            <p className="diagnostic-eyebrow">empty case bank</p>
            <h2>Semua vignette sudah selesai.</h2>
            <p>
              Kamu sudah menyelesaikan semua kasus yang tersedia. Balik ke
              dashboard untuk review attempt terakhir.
            </p>
            <Link href="/dashboard" className="quiz-primary-link">
              Review dashboard
            </Link>
          </section>
        ) : null}

        {quiz ? (
          <div className="quiz-workspace">
            <section className="quiz-panel">
              <div className="quiz-section-head">
                <div>
                  <p className="diagnostic-eyebrow">case clues</p>
                  <h2>Petunjuk yang sudah terbuka.</h2>
                </div>
              </div>

              <div className="quiz-clue-grid" aria-label="Daftar clue">
                <div className="quiz-diagnosis-header">
                  <span>What&apos;s the Diagnosis?</span>
                </div>
                {quiz.clues.map((clue) => (
                  <article
                    key={clue.clue_number}
                    className={
                      clue.content
                        ? "quiz-clue-card"
                        : "quiz-clue-card quiz-clue-card--locked"
                    }
                  >
                    <span>
                      Clue {clue.clue_number} / {clueTypeLabel(clue.type)}
                    </span>
                    <p>
                      {clue.content ??
                        "Terkunci. Buka clue tambahan kalau hipotesismu belum kuat."}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <aside className="quiz-panel quiz-answer-panel">
              <p className="diagnostic-eyebrow">diagnosis answer</p>
              <h2>Kirim diagnosis final.</h2>

              <form onSubmit={handleSubmit} className="quiz-answer-form">
                <label htmlFor="diagnosis">Cari atau tulis nama penyakit</label>
                <input
                  id="diagnosis"
                  value={diagnosis}
                  onChange={(event) => {
                    setDiagnosis(event.target.value);
                    setSelectedDisease(null);
                  }}
                  disabled={Boolean(result)}
                  placeholder="Contoh: Dengue Fever"
                  autoComplete="off"
                />

                {suggestions.length > 0 ? (
                  <div className="quiz-suggestions" aria-label="Saran penyakit">
                    {suggestions.map((disease) => (
                      <button
                        key={disease.id}
                        type="button"
                        onClick={() => selectDisease(disease)}
                      >
                        <strong>{disease.name}</strong>
                        <span>{disease.icd_code}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={Boolean(result) || isSubmitting}
                  className="quiz-submit-button"
                >
                  {isSubmitting ? "Mengirim..." : "Submit diagnosis"}
                </button>
              </form>

              {result ? (
                <section
                  className={
                    result.is_correct
                      ? "quiz-result quiz-result--correct"
                      : "quiz-result quiz-result--wrong"
                  }
                  aria-label="Hasil diagnosis"
                >
                  <span>{resultLabel(result)}</span>
                  <h3>{result.correct_disease?.name || "Attempt selesai"}</h3>
                  <p>{resultCopy(result)}</p>
                </section>
              ) : null}
            </aside>
          </div>
        ) : null}

        {result && (result.is_correct || revealedClues.length >= maxClues) ? (
          <section className="quiz-panel quiz-explanation">
            <div className="quiz-section-head">
              <div>
                <p className="diagnostic-eyebrow">ai explanation</p>
                <h2>Review alasan klinis.</h2>
              </div>
            </div>

            {isLoadingExplanation ? (
              <p className="quiz-muted">Memuat penjelasan AI...</p>
            ) : null}

            {explanationError ? (
              <p role="alert" className="diagnostic-alert">
                {explanationError}
              </p>
            ) : null}

            {explanation ? (
              <div className="quiz-explanation-grid">
                <article>
                  <span>Overview</span>
                  <p>{explanation.overview ?? "Belum ada overview."}</p>
                </article>

                <article>
                  <span>Pathophysiology</span>
                  <p>
                    {explanation.pathophysiology ??
                      "Belum ada pathophysiology."}
                  </p>
                </article>

                {[
                  [
                    "Clinical features",
                    listItems(explanation.clinical_features),
                  ],
                  ["Diagnosis", listItems(explanation.diagnosis)],
                  ["Management", listItems(explanation.management)],
                  ["Prevention", listItems(explanation.prevention)],
                  ["Key points", listItems(explanation.key_points)],
                ].map(([title, items]) => (
                  <article key={title as string}>
                    <span>{title as string}</span>
                    {(items as string[]).length > 0 ? (
                      <ul>
                        {(items as string[]).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>Belum tersedia.</p>
                    )}
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {result && initialMode === "random" && !isLoading ? (
          <div className="quiz-next flex justify-center pt-4">
            <button
              type="button"
              onClick={handleNext}
              className="quiz-primary-link"
            >
              Next Quiz →
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
