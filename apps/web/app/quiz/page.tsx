import type { Metadata } from "next";
import { QuizClient } from "../_components/quiz/quiz-client";
import type { QuizMode } from "../_lib/quiz-api";
import "./quiz.css";

type QuizSearchParams = {
  mode?: string | string[];
};

type QuizPageProps = {
  searchParams?: Promise<QuizSearchParams> | QuizSearchParams;
};

export const metadata: Metadata = {
  title: "Quiz — clinIQ AI",
  description: "Latihan diagnosis dari clue klinis dengan feedback AI.",
};

function normalizeMode(value?: string | string[]): QuizMode {
  const mode = Array.isArray(value) ? value[0] : value;

  return mode === "random" ? "random" : "daily";
}

export default async function QuizPage({ searchParams }: QuizPageProps) {
  const params = searchParams ? await searchParams : undefined;

  return <QuizClient initialMode={normalizeMode(params?.mode)} />;
}
