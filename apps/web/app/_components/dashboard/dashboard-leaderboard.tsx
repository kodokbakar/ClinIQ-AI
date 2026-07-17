"use client";

import { useEffect, useState } from "react";
import {
  getGlobalLeaderboard,
  getGroupLeaderboard,
  type LeaderboardEntry,
} from "../../_lib/leaderboard-api";
import { type GroupSummary } from "../../_lib/groups-api";

type DashboardLeaderboardProps = {
  group: GroupSummary | null;
};

export function DashboardLeaderboard({ group }: DashboardLeaderboardProps) {
  const [tab, setTab] = useState<"global" | "group">(group ? "group" : "global");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadLeaderboard() {
      try {
        setIsLoading(true);
        setError("");
        const data =
          tab === "group" && group
            ? await getGroupLeaderboard(group.id)
            : await getGlobalLeaderboard();

        if (mounted) {
          setEntries(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Gagal memuat leaderboard.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadLeaderboard();

    return () => {
      mounted = false;
    };
  }, [tab, group]);

  return (
    <section className="diagnostic-panel action-hub" style={{ marginTop: "1.5rem" }}>
      <div className="diagnostic-section-head">
        <div>
          <p className="diagnostic-eyebrow">competitive edge</p>
          <h2>Leaderboard Ranking.</h2>
        </div>
      </div>

      <div className="group-modal__tabs flex gap-1 rounded-xl bg-[var(--auth-line)] p-1 mb-4" style={{ maxWidth: "20rem" }}>
        <button
          type="button"
          className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            tab === "global"
              ? "bg-[var(--auth-cream)] text-[var(--auth-ink)] shadow-sm"
              : "text-[var(--auth-muted)] hover:text-[var(--auth-ink)]"
          }`}
          onClick={() => setTab("global")}
        >
          Global
        </button>
        {group ? (
          <button
            type="button"
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              tab === "group"
                ? "bg-[var(--auth-cream)] text-[var(--auth-ink)] shadow-sm"
                : "text-[var(--auth-muted)] hover:text-[var(--auth-ink)]"
            }`}
            onClick={() => setTab("group")}
          >
            Grup: {group.name}
          </button>
        ) : null}
      </div>

      {isLoading ? (
        <p className="quiz-muted text-sm">Memuat ranking...</p>
      ) : error ? (
        <p role="alert" className="settings-form__error text-sm">
          {error}
        </p>
      ) : entries.length === 0 ? (
        <p className="quiz-muted text-sm">Belum ada skor tercatat.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {entries.map((entry, index) => (
            <div
              key={entry.user_id}
              className="flex justify-between items-center p-3 rounded-lg border border-[var(--auth-line)] bg-[rgba(255,249,238,0.4)]"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "1.75rem",
                    height: "1.75rem",
                    borderRadius: "50%",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    background:
                      index === 0
                        ? "var(--auth-orange)"
                        : index === 1
                        ? "var(--auth-teal)"
                        : "var(--auth-line)",
                    color: index < 2 ? "var(--auth-cream)" : "var(--auth-ink)",
                  }}
                >
                  {index + 1}
                </span>
                <span className="font-bold text-sm">{entry.name}</span>
              </div>
              <strong className="text-sm" style={{ color: "var(--auth-teal-dark)" }}>
                {entry.score} pts
              </strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
