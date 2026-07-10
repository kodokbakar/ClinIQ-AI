import type { ApiResult } from "./auth-api";

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

async function requestApi<T>(path: string): Promise<ApiResult<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  const result = (await response.json()) as ApiResult<T>;

  if (!response.ok) {
    throw new Error(result.message || "Permintaan gagal diproses.");
  }

  return result;
}

export async function getDailyQuiz(): Promise<QuizAttempt | EmptyQuiz> {
  const result = await requestApi<QuizAttempt | EmptyQuiz>(
    "/api/v1/quiz/daily",
  );

  if (!result.data) {
    throw new Error(result.message || "Kasus harian tidak tersedia.");
  }

  return result.data;
}

export async function getMyAttempts(
  limit = 5,
): Promise<PaginatedResult<QuizAttemptHistory>> {
  const result = await requestApi<QuizAttemptHistory[]>(
    `/api/v1/quiz/attempts/me?page=1&limit=${limit}`,
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
