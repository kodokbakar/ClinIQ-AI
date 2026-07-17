"use client";

import { type FormEvent, useEffect, useState } from "react";
import {
  createGroup,
  disbandGroup,
  getGroupById,
  joinGroupByCode,
  leaveGroup,
  type GroupDetails,
  type GroupSummary,
} from "../../_lib/groups-api";
import "./group-membership-modal.css";

type GroupMembershipModalProps = {
  isOpen: boolean;
  group: GroupSummary | null;
  onClose: () => void;
  onJoined: (group: GroupSummary, details: GroupDetails | null) => void;
  onLeft: () => void;
};

export function GroupMembershipModal({
  isOpen,
  group,
  onClose,
  onJoined,
  onLeft,
}: GroupMembershipModalProps) {
  const [mode, setMode] = useState<"join" | "create">("join");
  const [inviteCode, setInviteCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isLeader = group?.my_role === "admin";

  useEffect(() => {
    if (!isOpen) {
      setMode("join");
      setInviteCode("");
      setGroupName("");
      setGroupDescription("");
      setError("");
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isSubmitting, onClose]);

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedCode = inviteCode.trim().toUpperCase();

    if (!normalizedCode) {
      setError("Kode undangan tidak boleh kosong.");
      return;
    }

    try {
      setError("");
      setIsSubmitting(true);

      const joinedGroup = await joinGroupByCode(normalizedCode);
      const details = await getGroupById(joinedGroup.id).catch(() => null);

      onJoined(joinedGroup, details);
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Grup gagal dimasuki.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = groupName.trim();
    if (!name) {
      setError("Nama grup tidak boleh kosong.");
      return;
    }

    try {
      setError("");
      setIsSubmitting(true);

      const createdGroup = await createGroup({
        name,
        description: groupDescription.trim() || undefined,
      });
      const details = await getGroupById(createdGroup.id).catch(() => null);

      onJoined(createdGroup, details);
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Grup gagal dibuat.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRemoveGroup() {
    if (!group) return;

    try {
      setError("");
      setIsSubmitting(true);

      if (isLeader) {
        await disbandGroup(group.id);
      } else {
        await leaveGroup(group.id);
      }

      onLeft();
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : isLeader
            ? "Gagal membubarkan grup."
            : "Gagal keluar dari grup.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  const modalEyebrow = group
    ? isLeader
      ? "disband study circle"
      : "leave study circle"
    : "join study circle";

  const modalTitle = group
    ? isLeader
      ? "Bubarkan grup?"
      : "Keluar dari grup?"
    : "Masukkan kode grup.";

  return (
    <div
      className="group-modal-backdrop fixed inset-0 z-50 grid place-items-center p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-modal-title"
        className="group-modal w-full max-w-xl"
      >
        <div className="group-modal__header flex items-start justify-between gap-4">
          <div>
            <p className="diagnostic-eyebrow">{modalEyebrow}</p>
            <h2 id="group-modal-title">{modalTitle}</h2>
          </div>

          <button
            type="button"
            className="group-modal__close"
            aria-label="Tutup modal grup"
            disabled={isSubmitting}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {group ? (
          <div className="group-modal__leave grid gap-5">
            <div className="group-modal__current-group">
              <span>current group</span>
              <strong>{group.name}</strong>
              <small>{group.member_count} anggota</small>
            </div>

            {isLeader ? (
              <p className="group-modal__notice">
                Grup beserta seluruh keanggotaannya akan dihapus. Tindakan ini
                tidak dapat dibatalkan.
              </p>
            ) : (
              <p className="group-modal__copy">
                Setelah keluar, grup ini tidak lagi muncul di dashboard dan
                progresmu tidak lagi terhubung dengan grup tersebut.
              </p>
            )}

            {error ? (
              <p role="alert" className="group-modal__error">
                {error}
              </p>
            ) : null}

            <div className="group-modal__actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="group-modal__secondary"
                disabled={isSubmitting}
                onClick={onClose}
              >
                Batal
              </button>

              <button
                type="button"
                className="group-modal__danger"
                disabled={isSubmitting}
                onClick={handleRemoveGroup}
              >
                {isSubmitting
                  ? isLeader
                    ? "Membubarkan..."
                    : "Keluar..."
                  : isLeader
                    ? "Bubarkan grup"
                    : "Keluar dari grup"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div
              className="group-modal__tabs flex gap-1 rounded-xl bg-[var(--auth-line)] p-1"
              role="tablist"
              aria-label="Pilih tindakan grup"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "join"}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
                  mode === "join"
                    ? "bg-[var(--auth-cream)] text-[var(--auth-ink)] shadow-sm"
                    : "text-[var(--auth-muted)] hover:text-[var(--auth-ink)]"
                }`}
                onClick={() => {
                  setMode("join");
                  setError("");
                }}
              >
                Gabung
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "create"}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
                  mode === "create"
                    ? "bg-[var(--auth-cream)] text-[var(--auth-ink)] shadow-sm"
                    : "text-[var(--auth-muted)] hover:text-[var(--auth-ink)]"
                }`}
                onClick={() => {
                  setMode("create");
                  setError("");
                }}
              >
                Buat Baru
              </button>
            </div>

            {mode === "join" ? (
              <form
                className="group-modal__form grid gap-4"
                data-testid="group-modal-form"
                onSubmit={handleJoin}
                noValidate
              >
                <p className="group-modal__copy">
                  Masukkan kode undangan dari pemilik grup. Huruf besar dan
                  kecil dianggap sama.
                </p>

                <div className="grid gap-2">
                  <label htmlFor="group-modal-invite-code">
                    Kode undangan
                  </label>
                  <input
                    id="group-modal-invite-code"
                    name="invite_code"
                    type="text"
                    value={inviteCode}
                    maxLength={20}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    placeholder="Contoh: INVITEA1234"
                    onChange={(event) =>
                      setInviteCode(event.target.value.toUpperCase())
                    }
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                      error ? "group-modal-error" : undefined
                    }
                  />
                </div>

                {error ? (
                  <p
                    id="group-modal-error"
                    role="alert"
                    className="group-modal__error"
                  >
                    {error}
                  </p>
                ) : null}

                <div className="group-modal__actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="group-modal__secondary"
                    disabled={isSubmitting}
                    onClick={onClose}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="group-modal__primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Menghubungkan..." : "Gabung ke grup"}
                  </button>
                </div>
              </form>
            ) : (
              <form
                className="group-modal__form grid gap-4"
                onSubmit={handleCreate}
                noValidate
              >
                <p className="group-modal__copy">
                  Buat grup belajar baru. Kamu akan otomatis menjadi admin grup.
                </p>

                <div className="grid gap-2">
                  <label htmlFor="group-modal-name">Nama grup</label>
                  <input
                    id="group-modal-name"
                    name="name"
                    type="text"
                    value={groupName}
                    maxLength={100}
                    autoComplete="off"
                    placeholder="Contoh: Kelompok Belajar A"
                    onChange={(event) => setGroupName(event.target.value)}
                    aria-invalid={Boolean(error)}
                    aria-describedby={
                      error ? "group-modal-error" : undefined
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <label htmlFor="group-modal-description">
                    Deskripsi{" "}
                    <span className="text-sm text-[var(--auth-muted)]">
                      (opsional)
                    </span>
                  </label>
                  <textarea
                    id="group-modal-description"
                    name="description"
                    value={groupDescription}
                    maxLength={500}
                    rows={2}
                    placeholder="Cerita sedikit tentang grup ini..."
                    onChange={(event) =>
                      setGroupDescription(event.target.value)
                    }
                  />
                </div>

                {error ? (
                  <p
                    id="group-modal-error"
                    role="alert"
                    className="group-modal__error"
                  >
                    {error}
                  </p>
                ) : null}

                <div className="group-modal__actions flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="group-modal__secondary"
                    disabled={isSubmitting}
                    onClick={onClose}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="group-modal__primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Membuat..." : "Buat grup"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
