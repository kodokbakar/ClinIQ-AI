"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  bulkGenerateVignettes,
  generateVignette,
  getAdminUsers,
  resetUserPassword,
  toggleUserAccess,
  uploadICD,
  type AdminUser,
} from "../_lib/admin-api";
import { type AuthUser } from "../_lib/auth-api";
import { searchDiseases, type DiseaseSearchResult } from "../_lib/quiz-api";
import "./../dashboard/dashboard-home.css";
import "./../dashboard/dashboard-shell.css";

type Props = { user: AuthUser };

export default function AdminClientPage() {
  const [icdFile, setIcdFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState("");

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<DiseaseSearchResult[]>([]);
  const [selected, setSelected] = useState<DiseaseSearchResult | null>(null);
  const [difficulty, setDifficulty] = useState("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genResult, setGenResult] = useState("");

  const [bulkLimit, setBulkLimit] = useState("10");
  const [bulkDifficulty, setBulkDifficulty] = useState("medium");
  const [isBulk, setIsBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState("");

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");
  const [usersAction, setUsersAction] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    getAdminUsers({ limit: 100 })
      .then(({ data }) => {
        if (mounted) setAdminUsers(data);
      })
      .catch((error) => {
        if (mounted) setUsersError(error instanceof Error ? error.message : "Gagal memuat user.");
      })
      .finally(() => {
        if (mounted) setIsUsersLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2 || selected) {
      setSuggestions([]);
      return;
    }
    let mounted = true;
    searchDiseases(query)
      .then((items) => {
        if (mounted) setSuggestions(items);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [query, selected]);

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    if (!icdFile) return;
    try {
      setIsUploading(true);
      setUploadResult("");
      const res = await uploadICD(icdFile);
      setUploadResult(`Created: ${res.created}, Updated: ${res.updated}, Errors: ${res.errors}`);
      setIcdFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e) {
      setUploadResult(e instanceof Error ? e.message : "Upload gagal.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleGenerate(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try {
      setIsGenerating(true);
      setGenResult("");
      await generateVignette({ disease_id: selected.id, difficulty });
      setGenResult(`Vignette generated for ${selected.name}.`);
      setQuery("");
      setSelected(null);
    } catch (e) {
      setGenResult(e instanceof Error ? e.message : "Generate gagal.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleBulk(event: FormEvent) {
    event.preventDefault();
    try {
      setIsBulk(true);
      setBulkResult("");
      const res = await bulkGenerateVignettes({ limit: parseInt(bulkLimit) || 10, difficulty: bulkDifficulty });
      setBulkResult(
        Array.isArray(res)
          ? `Generated ${(res as { disease: string; success: boolean }[]).filter((r) => r.success).length} vignettes.`
          : "Bulk generate completed."
      );
    } catch (e) {
      setBulkResult(e instanceof Error ? e.message : "Bulk generate gagal.");
    } finally {
      setIsBulk(false);
    }
  }

  async function handleToggleAccess(userId: string) {
    try {
      setUsersAction("Memperbarui akses...");
      await toggleUserAccess(userId);
      setAdminUsers((current) =>
        current.map((u) => (u.id === userId ? { ...u, status: !u.status } : u))
      );
    } finally {
      setUsersAction("");
    }
  }

  async function handleResetPassword(userId: string) {
    try {
      setUsersAction("Reset password...");
      await resetUserPassword(userId);
    } finally {
      setUsersAction("");
    }
  }

  return (
    <main className="diagnostic-shell">
      <div id="dashboard-menu" className="diagnostic-sidebar__inner">
        <section className="dashboard-grid">
          <header className="diagnostic-hero">
            <div>
              <p className="diagnostic-eyebrow">admin panel</p>
              <h1>Kelola data klinis.</h1>
              <p>Upload ICD, generate vignette, dan kelola konten quiz.</p>
            </div>
          </header>

          <section className="diagnostic-panel">
            <div className="diagnostic-section-head">
              <div>
                <p className="diagnostic-eyebrow">icd data</p>
                <h2>Upload ICD CSV.</h2>
              </div>
            </div>
            <form onSubmit={handleUpload} className="quiz-answer-form" style={{ maxWidth: "32rem" }}>
              <label htmlFor="icd-file">CSV file (icd_code, name, description)</label>
              <input id="icd-file" ref={fileRef} type="file" accept=".csv" onChange={(e) => setIcdFile(e.target.files?.[0] ?? null)} required />
              <button type="submit" disabled={!icdFile || isUploading} className="quiz-submit-button">
                {isUploading ? "Uploading..." : "Upload ICD"}
              </button>
              {uploadResult ? <p className="quiz-muted">{uploadResult}</p> : null}
            </form>
          </section>

          <section className="diagnostic-panel">
            <div className="diagnostic-section-head">
              <div>
                <p className="diagnostic-eyebrow">vignette</p>
                <h2>Generate vignette.</h2>
              </div>
            </div>
            <form onSubmit={handleGenerate} className="quiz-answer-form" style={{ maxWidth: "32rem" }}>
              <label htmlFor="disease-search">Cari penyakit</label>
              <input id="disease-search" value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); }} placeholder="Ketik nama penyakit..." autoComplete="off" />
              {suggestions.length > 0 ? (
                <div className="quiz-suggestions" style={{ position: "static" }}>
                  {suggestions.map((d) => (
                    <button key={d.id} type="button" onClick={() => { setSelected(d); setQuery(d.name); setSuggestions([]); }}>
                      <strong>{d.name}</strong>
                      <span>{d.icd_code}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <label htmlFor="difficulty">Difficulty</label>
              <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <button type="submit" disabled={!selected || isGenerating} className="quiz-submit-button">
                {isGenerating ? "Generating..." : "Generate Vignette"}
              </button>
              {genResult ? <p className="quiz-muted">{genResult}</p> : null}
            </form>
          </section>

          <section className="diagnostic-panel">
            <div className="diagnostic-section-head">
              <div>
                <p className="diagnostic-eyebrow">bulk</p>
                <h2>Bulk generate vignettes.</h2>
              </div>
            </div>
            <form onSubmit={handleBulk} className="quiz-answer-form" style={{ maxWidth: "32rem" }}>
              <div className="flex gap-4" style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <div className="grid gap-2" style={{ flex: 1 }}>
                  <label htmlFor="bulk-limit">Jumlah</label>
                  <input id="bulk-limit" type="number" min={1} max={50} value={bulkLimit} onChange={(e) => setBulkLimit(e.target.value)} />
                </div>
                <div className="grid gap-2" style={{ flex: 1 }}>
                  <label htmlFor="bulk-difficulty">Difficulty</label>
                  <select id="bulk-difficulty" value={bulkDifficulty} onChange={(e) => setBulkDifficulty(e.target.value)}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={isBulk} className="quiz-submit-button">
                {isBulk ? "Generating..." : "Bulk Generate"}
              </button>
              {bulkResult ? <p className="quiz-muted">{bulkResult}</p> : null}
            </form>
          </section>

          <section className="diagnostic-panel">
            <div className="diagnostic-section-head">
              <div>
                <p className="diagnostic-eyebrow">users</p>
                <h2>User management.</h2>
              </div>
            </div>
            {usersAction ? <p className="quiz-muted">{usersAction}</p> : null}
            {usersError ? <p className="settings-form__error">{usersError}</p> : null}
            {isUsersLoading ? (
              <p className="quiz-muted">Memuat user...</p>
            ) : adminUsers.length === 0 ? (
              <p className="quiz-muted">Belum ada user.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Email</th>
                      <th className="text-left p-2">Role</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((u) => (
                      <tr key={u.id} className="border-t border-[var(--auth-line)]">
                        <td className="p-2 font-medium">{u.name}</td>
                        <td className="p-2">{u.email}</td>
                        <td className="p-2">{u.role?.name ?? "User"}</td>
                        <td className="p-2">{u.status ? "Active" : "Disabled"}</td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="quiz-primary-link" onClick={() => handleToggleAccess(u.id)}>Toggle access</button>
                            <button type="button" className="quiz-primary-link" onClick={() => handleResetPassword(u.id)}>Reset password</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
