import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuizClient } from "./quiz-client";

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}));

function mockApiResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(body),
  } as Response;
}

const quizResponse = {
  success: true,
  data: {
    attempt_id: "attempt-1",
    vignette_id: "vignette-1",
    clues_revealed: 1,
    is_completed: false,
    clues: [
      {
        clue_number: 1,
        content: "Fever for three days",
        type: "history",
        is_revealed: true,
      },
      {
        clue_number: 2,
        content: null,
        type: "clinical",
        is_revealed: false,
      },
    ],
  },
};

describe("QuizClient", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    vi.spyOn(global, "fetch").mockImplementation(
      vi.fn((url: string, init?: RequestInit) => {
        if (url.includes("/api/v1/quiz/daily")) {
          return Promise.resolve(mockApiResponse(quizResponse, true));
        }

        if (url.includes("/api/v1/quiz/random")) {
          return Promise.resolve(mockApiResponse(quizResponse, true));
        }


if (url.includes("/api/v1/diseases/search")) {
          return Promise.resolve(
            mockApiResponse({
              success: true,
              data: [
                {
                  id: "disease-1",
                  icd_code: "1D2Z",
                  name: "Dengue Fever",
                },
              ],
            }),
          );
        }


        if (url.includes("/api/v1/quiz/submit-diagnosis")) {
          expect(init?.method).toBe("POST");
          const body = JSON.parse(init?.body as string);
          
          if (body.diagnosis === "Dengue Fever") {
            return Promise.resolve(
              mockApiResponse({
                success: true,
                data: {
                  attempt_id: "attempt-1",
                  is_correct: true,
                  correct_disease: {
                    name: "Dengue Fever",
                    icd_code: "1D2Z",
                  },
                  score: 500,
                  clues_revealed: 1,
                },
              }),
            );
          } else {
             return Promise.resolve(
              mockApiResponse({
                success: true,
                data: {
                  attempt_id: "attempt-1",
                  clues_revealed: 2,
                  clue: {
                    clue_number: 2,
                    content: "Platelet count is low",
                    type: "clinical",
                  },
                },
              }),
            );
          }
        }

        if (url.includes("/api/v1/ai/explanation/disease-1")) {
          return Promise.resolve(
            mockApiResponse({
              success: true,
              data: {
                disease_id: "disease-1",
                locale: "id",
                overview: "Dengue overview",
                pathophysiology: "Dengue pathophysiology",
                clinical_features: ["fever"],
                diagnosis: ["cbc"],
                management: ["fluid"],
                prevention: ["mosquito control"],
                key_points: ["watch warning signs"],
              },
            }),
          );
        }

        return Promise.reject(new Error(`unexpected url: ${url}`));
      }),
    );
  });

  it("loads daily quiz with daily header", async () => {
    render(<QuizClient initialMode="daily" />);

    await waitFor(() => {
      expect(screen.queryByText("Fever for three days")).toBeTruthy();
    });

    expect(screen.queryByText("daily clinical round")).toBeTruthy();
    expect(screen.queryByText(/Kasus harian/i)).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/quiz/daily"),
      expect.any(Object),
    );
  });

  it("navigates back to dashboard from navbar button", async () => {
    render(<QuizClient initialMode="daily" />);

    await waitFor(() => {
      expect(screen.queryByText("Fever for three days")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: /back to dashboard/i }));

    expect(pushMock).toHaveBeenCalledWith("/dashboard");
  });

  it("loads random quiz with random header", async () => {
    render(<QuizClient initialMode="random" />);

    await waitFor(() => {
      expect(screen.queryByText("Fever for three days")).toBeTruthy();
    });

    expect(screen.queryByText("random diagnostic drill")).toBeTruthy();
    expect(screen.queryByText(/Kasus acak/i)).toBeTruthy();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/quiz/random"),
      expect.any(Object),
    );
  });

  it("reveals next clue when an incorrect diagnosis unlocks it", async () => {
    render(<QuizClient initialMode="daily" />);

    await waitFor(() => {
      expect(screen.queryByText("Fever for three days")).toBeTruthy();
    });

    // Clue 2 is locked before an incorrect guess
    expect(screen.queryByText("Platelet count is low")).toBeFalsy();

    fireEvent.change(screen.getByLabelText("Cari atau tulis nama penyakit"), {
      target: { value: "Wrong Disease" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /submit diagnosis/i }),
    );

    await waitFor(() => {
      expect(screen.queryByText("Platelet count is low")).toBeTruthy();
    });
  });

  it("searches disease, submits diagnosis, and shows AI explanation", async () => {
    render(<QuizClient initialMode="daily" />);

    await waitFor(() => {
      expect(screen.queryByText("Fever for three days")).toBeTruthy();
    });

    fireEvent.change(screen.getByLabelText("Cari atau tulis nama penyakit"), {
      target: { value: "Dengue" },
    });

    const suggestion = await screen.findByRole("button", {
      name: /dengue fever/i,
    });

    fireEvent.click(suggestion);
    fireEvent.click(screen.getByRole("button", { name: /submit diagnosis/i }));

    await waitFor(() => {
      expect(screen.queryByText("Diagnosis tepat")).toBeTruthy();
    });

    expect(screen.queryByText("Dengue overview")).toBeTruthy();
    expect(screen.queryByText("watch warning signs")).toBeTruthy();
  });

  it("redirects to login when quiz request fails", async () => {
    vi.spyOn(global, "fetch").mockImplementation(
      vi.fn((url: string) => {
        if (url.includes("/api/v1/quiz/daily")) {
          return Promise.resolve(
            mockApiResponse(
              {
                success: false,
                message: "Unauthorized, token not found",
                data: null,
              },
              false,
            ),
          );
        }

        return Promise.reject(new Error(`unexpected url: ${url}`));
      }),
    );

    render(<QuizClient initialMode="daily" />);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login");
    });
  });
});
