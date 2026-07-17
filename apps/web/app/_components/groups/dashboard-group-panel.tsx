import type { GroupSummary } from "../../_lib/groups-api";
import "./dashboard-group-panel.css";

type DashboardGroupPanelProps = {
  group: GroupSummary | null;
  onMembershipAction: () => void;
  onViewMembers: () => void;
};

export function DashboardGroupPanel({
  group,
  onMembershipAction,
  onViewMembers,
}: DashboardGroupPanelProps) {
  const isLeader = group?.my_role === "admin";

  return (
    <section
      className="dashboard-group-panel grid gap-2"
      aria-label="Status grup belajar"
    >
      <div
        className="dashboard-group-status flex items-center justify-between gap-3"
        aria-label={
          group ? `Grup belajar: ${group.name}` : "Mode belajar: Solo player"
        }
      >
        <span>{group ? "study group" : "play mode"}</span>
        <strong>{group?.name ?? "Solo player"}</strong>
      </div>

      {group ? (
        <div className="dashboard-group-actions">
          <div className="dashboard-group-actions__header flex items-center justify-between gap-3">
            <span>members</span>
            <strong>{group.member_count}</strong>
          </div>

          <div className="dashboard-group-actions__buttons grid gap-2">
            <button
              type="button"
              className="dashboard-group-action dashboard-group-action--danger"
              onClick={onMembershipAction}
            >
              {isLeader ? "Disband Group" : "Leave Group"}
            </button>

            <button
              type="button"
              className="dashboard-group-action dashboard-group-action--secondary"
              onClick={onViewMembers}
            >
              Member List
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
