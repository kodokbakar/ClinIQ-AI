"use client";

import { useEffect } from "react";
import type { GroupDetails, GroupSummary } from "../../_lib/groups-api";
import "./group-members-modal.css";

type GroupMembersModalProps = {
  isOpen: boolean;
  group: GroupSummary | null;
  details: GroupDetails | null;
  onClose: () => void;
};

export function GroupMembersModal({
  isOpen,
  group,
  details,
  onClose,
}: GroupMembersModalProps) {
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, onClose]);

  if (!isOpen || !group) return null;

  const members = details?.members ?? [];

  return (
    <div
      className="group-members-modal-backdrop fixed inset-0 z-50 grid place-items-center p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-members-modal-title"
        className="group-members-modal w-full max-w-xl"
      >
        <div className="group-members-modal__header flex items-start justify-between gap-4">
          <div>
            <p className="diagnostic-eyebrow">study circle members</p>
            <h2 id="group-members-modal-title">Anggota {group.name}</h2>
          </div>

          <button
            type="button"
            className="group-members-modal__close"
            aria-label="Tutup daftar anggota"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="group-members-modal__summary flex items-center justify-between gap-3">
          <span>total members</span>
          <strong>{group.member_count}</strong>
        </div>

        {members.length > 0 ? (
          <ul
            className="group-members-modal__list grid gap-2"
            aria-label={`Daftar anggota ${group.name}`}
          >
            {members.map((member) => (
              <li
                key={member.id}
                className="group-members-modal__member flex items-center gap-3"
              >
                <span
                  className="group-members-modal__avatar"
                  aria-hidden="true"
                >
                  {member.user.name.slice(0, 1).toUpperCase()}
                </span>

                <span className="group-members-modal__identity">
                  <strong>{member.user.name}</strong>
                  <small>{member.user.email}</small>
                </span>

                <span className="group-members-modal__role">
                  {member.is_admin ? "Admin" : "Member"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="group-members-modal__empty">
            Daftar anggota belum tersedia.
          </p>
        )}
      </section>
    </div>
  );
}
