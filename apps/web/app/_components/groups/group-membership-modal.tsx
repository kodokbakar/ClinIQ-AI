"use client";

import { type FormEvent, useEffect, useState } from "react";
import {
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
  const [inviteCode, setInviteCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isLeader = group?.my_role === "admin";

  useEffect(() => {
    if (!isOpen) {
      setInviteCode("");
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
          <form
            className="group-modal__form grid gap-4"
            data-testid="group-modal-form"
            onSubmit={handleJoin}
            noValidate
          >
            <p className="group-modal__copy">
              Masukkan kode undangan dari pemilik grup. Huruf besar dan kecil
              dianggap sama.
            </p>

            <div className="grid gap-2">
              <label htmlFor="group-modal-invite-code">Kode undangan</label>

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
                aria-describedby={error ? "group-modal-error" : undefined}
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
        )}
      </section>
    </div>
  );
}
