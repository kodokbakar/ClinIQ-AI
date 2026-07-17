import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GroupMembershipModal } from "./group-membership-modal";

function mockApiResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

const group = {
  id: "group-1",
  name: "Kelompok Belajar A",
  description: "Latihan bersama.",
  owner_id: "owner-1",
  member_count: 2,
  my_role: "member" as const,
};

const leaderGroup = {
  ...group,
  owner_id: "user-1",
  my_role: "admin" as const,
};

const groupDetails = {
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
  ],
};

describe("Group membership modal", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("joins group from the modal", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        mockApiResponse(
          {
            success: true,
            message: "success",
            data: {
              message: "Successfully joined group",
              group_id: group.id,
              group,
            },
          },
          201,
        ),
      )
      .mockResolvedValueOnce(
        mockApiResponse({
          success: true,
          message: "success",
          data: groupDetails,
        }),
      );

    const onJoined = vi.fn();
    const onClose = vi.fn();

    render(
      <GroupMembershipModal
        isOpen
        group={null}
        onClose={onClose}
        onJoined={onJoined}
        onLeft={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Kode undangan"), {
      target: {
        value: "invitea1234",
      },
    });

    fireEvent.submit(screen.getByTestId("group-modal-form"));

    await waitFor(() => {
      expect(onJoined).toHaveBeenCalledWith(group, groupDetails);
    });

    expect(onClose).toHaveBeenCalled();
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/api/v1/groups/join"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          invite_code: "INVITEA1234",
        }),
      }),
    );
  });

  it("leaves current group", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockApiResponse({
        success: true,
        message: "success",
        data: {
          message: "Successfully left group",
        },
      }),
    );

    const onLeft = vi.fn();
    const onClose = vi.fn();

    render(
      <GroupMembershipModal
        isOpen
        group={group}
        onClose={onClose}
        onJoined={vi.fn()}
        onLeft={onLeft}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Keluar dari grup",
      }),
    );

    await waitFor(() => {
      expect(onLeft).toHaveBeenCalledTimes(1);
    });

    expect(onClose).toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/groups/group-1/leave"),
      expect.objectContaining({
        method: "POST",
        credentials: "include",
      }),
    );
  });

  it("disbands current group when user is the leader", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      mockApiResponse({
        success: true,
        message: "success",
        data: {
          message: "Group deleted",
        },
      }),
    );

    const onLeft = vi.fn();
    const onClose = vi.fn();

    render(
      <GroupMembershipModal
        isOpen
        group={leaderGroup}
        onClose={onClose}
        onJoined={vi.fn()}
        onLeft={onLeft}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "Bubarkan grup?",
      }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Bubarkan grup",
      }),
    );

    await waitFor(() => {
      expect(onLeft).toHaveBeenCalledTimes(1);
    });

    expect(onClose).toHaveBeenCalled();

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/groups/group-1"),
      expect.objectContaining({
        method: "DELETE",
        credentials: "include",
      }),
    );
  });
});
