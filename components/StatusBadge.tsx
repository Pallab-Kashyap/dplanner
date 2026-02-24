"use client";

type Status = "pending" | "partial" | "completed" | "failed";

const statusIcons: Record<Status, string> = {
  pending: "○",
  partial: "◐",
  completed: "✓",
  failed: "✗",
};

const statusLabels: Record<Status, string> = {
  pending: "Pending",
  partial: "Partially done",
  completed: "Completed",
  failed: "Failed",
};

const statusOrder: Status[] = ["pending", "completed", "partial", "failed"];

interface StatusBadgeProps {
  status: Status;
  onChange?: (newStatus: Status) => void;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, onChange, size = "md" }: StatusBadgeProps) {
  const handleClick = () => {
    if (!onChange) return;
    const currentIdx = statusOrder.indexOf(status);
    const nextIdx = (currentIdx + 1) % statusOrder.length;
    onChange(statusOrder[nextIdx]);
  };

  const sizeStyle = size === "sm" ? { width: 20, height: 20, fontSize: "0.65rem" } : {};

  return (
    <button
      className={`status-badge ${status}`}
      onClick={handleClick}
      title={statusLabels[status]}
      style={sizeStyle}
    >
      {statusIcons[status]}
    </button>
  );
}
