import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GroupMembersModal } from "./group-members-modal";

const group = {
  id: "group-1",
  name: "Kelompok Belajar A",
  owner_id: "owner-1",
  member_count: 2,
  my_role: "member" as const,
};

const details = {
  ...group,
  members: [
    {
      id: "member-1",
      user_id: "owner-1",
      is_admin: true,
      joined_at: "2026-07-10",
      user: {
        id: "owner-1",
        name: "Groups Owner",
        email: "owner@example.test",
      },
    },
    {
      id: "member-2",
      user_id: "user-1",
      is_admin: false,
      joined_at: "2026-07-11",
      user: {
        id: "user-1",
        name: "Dok Bakar",
        email: "dok@email.com",
      },
    },
  ],
};

describe("Group members modal", () => {
  it("renders group members and closes with Escape", () => {
    const onClose = vi.fn();

    render(
      <GroupMembersModal
        isOpen
        group={group}
        details={details}
        onClose={onClose}
      />,
    );

    const dialog = screen.getByRole("dialog", {
      name: "Anggota Kelompok Belajar A",
    });

    expect(within(dialog).getByText("owner@example.test")).toBeTruthy();
    expect(within(dialog).getByText("dok@email.com")).toBeTruthy();
    expect(within(dialog).getByText("Admin")).toBeTruthy();
    expect(within(dialog).getByText("Member")).toBeTruthy();

    fireEvent.keyDown(document, {
      key: "Escape",
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not render while closed", () => {
    render(
      <GroupMembersModal
        isOpen={false}
        group={group}
        details={details}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
