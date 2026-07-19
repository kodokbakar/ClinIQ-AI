import type { ApiResult } from "./auth-api";

export type QuizMode = "daily" | "random";

export type QuizClue = {
  clue_number: number;
  content: string | null;
  type: string | null;
  is_revealed?: boolean;
};

export type QuizAttempt = {
  attempt_id: string;
  vignette_id: string;
  clues_revealed: number;
  is_completed: boolean;
  is_correct?: boolean | null;
  score?: number | null;
  clues: QuizClue[];
};

export type EmptyQuiz = {
  message: string;
  is_empty: true;
};

export type SubmitDiagnosisResult = {
  is_correct: boolean;
  score?: number;
  correct_disease?: { name: string; icd_code: string };
  clues_revealed?: number;
  clue?: {
    clue_number: number;
    content: string;
    type: string | null;
  };
};

export type DiseaseSearchResult = {
  id: string;
  icd_code: string;
  name: string;
};

export type AIExplanation = {
  disease_id: string;
  locale: string;
  overview?: string | null;
  pathophysiology?: string | null;
  clinical_features?: string[] | null;
  diagnosis?: string[] | null;
  management?: string[] | null;
  prevention?: string[] | null;
  key_points?: string[] | null;
};

export type QuizAttemptHistory = {
  id: string;
  vignette_id: string;
  disease_name?: string | null;
  disease_icd?: string | null;
  clues_revealed: number;
  is_correct: boolean | null;
  score: number | null;
  attempt_date?: string | null;
  submitted_diagnosis?: string | null;
};

export type PaginationMetadata = {
  per_page: number;
  current_page: number;
  total_row: number;
  total_page: number;
  completed_attempts?: number;
  correct_attempts?: number;
  total_score?: number;
};

export type PaginatedResult<T> = {
  data: T[];
  metadata?: PaginationMetadata;
};

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(
  /\/$/,
  "",
);

const API_BASE_URL =
  configuredApiBaseUrl ??
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:8000");

async function requestApi<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    credentials: "include",
    ...init,
  });

  const result = (await response.json()) as ApiResult<T>;

  if (!response.ok) {
    throw new Error(result.message || "Permintaan gagal diproses.");
  }

  return result;
}

async function getQuiz(path: string): Promise<QuizAttempt | EmptyQuiz> {
  const result = await requestApi<QuizAttempt | EmptyQuiz>(path);

  if (!result.data) {
    throw new Error(result.message || "Kasus tidak tersedia.");
  }

  return result.data;
}

export function getDailyQuiz(): Promise<QuizAttempt | EmptyQuiz> {
  return getQuiz("/api/v1/quiz/daily");
}

export function getRandomQuiz(): Promise<QuizAttempt | EmptyQuiz> {
  return getQuiz("/api/v1/quiz/random");
}

export function getQuizByMode(
  mode: QuizMode,
): Promise<QuizAttempt | EmptyQuiz> {
  return mode === "random" ? getRandomQuiz() : getDailyQuiz();
}

export async function submitDiagnosis(payload: {
  attempt_id: string;
  diagnosis: string;
}): Promise<SubmitDiagnosisResult> {
  const result = await requestApi<SubmitDiagnosisResult>(
    "/api/v1/quiz/submit-diagnosis",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  if (!result.data) {
    throw new Error(result.message || "Diagnosis gagal dikirim.");
  }

  return result.data;
}

export async function searchDiseases(
  query: string,
  limit = 8,
): Promise<DiseaseSearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });

  const result = await requestApi<DiseaseSearchResult[]>(
    `/api/v1/diseases/search?${params.toString()}`,
  );

  return result.data ?? [];
}

export async function getAIExplanation(
  diseaseId: string,
): Promise<AIExplanation> {
  const result = await requestApi<AIExplanation>(
    `/api/v1/ai/explanation/${diseaseId}?locale=id`,
  );

  if (!result.data) {
    throw new Error(result.message || "Penjelasan AI belum tersedia.");
  }

  return result.data;
}

export async function getMyAttempts(
  limit = 5,
  page = 1,
): Promise<PaginatedResult<QuizAttemptHistory>> {
  const result = await requestApi<QuizAttemptHistory[]>(
    `/api/v1/quiz/attempts/me?page=${page}&limit=${limit}`,
  );

  return {
    data: result.data ?? [],
    metadata: result.metadata as PaginationMetadata | undefined,
  };
}

export function isEmptyQuiz(
  quiz: QuizAttempt | EmptyQuiz | null,
): quiz is EmptyQuiz {
  return Boolean(quiz && "is_empty" in quiz && quiz.is_empty);
}

export type QuizAttemptDetail = {
  id: string;
  vignette_id: string;
  variant_name: string;
  clues_revealed: number;
  is_correct: boolean;
  score: number | null;
  attempt_date?: string | null;
  submitted_diagnosis?: string | null;
  disease: {
    id: string;
    name: string;
    icd_code: string;
    description?: string | null;
  };
  clues: Array<{
    clue_number: number;
    content: string;
    type: string | null;
  }>;
  explanation: AIExplanation | null;
};

export async function getAttemptDetail(
  attemptId: string,
  signal?: AbortSignal,
): Promise<QuizAttemptDetail> {
  const result = await requestApi<QuizAttemptDetail>(
    `/api/v1/quiz/attempts/${encodeURIComponent(attemptId)}`,
    { signal },
  );

  if (!result.data) {
    throw new Error(result.message || "Detail riwayat tidak tersedia.");
  }

  return result.data;
}
