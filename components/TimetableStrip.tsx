"use client";

import StatusBadge from "@/components/StatusBadge";

interface TimeSlot {
  _id: string;
  startTime: string;
  endTime: string;
  title: string;
  description: string;
  status: "pending" | "partial" | "completed" | "failed";
  statusNote: string;
  tags: { _id: string; name: string; color: string }[];
}

interface TimetableStripProps {
  slots: TimeSlot[];
  onSlotStatusChange?: (slotId: string, status: string) => void;
  onSlotClick?: (slot: TimeSlot) => void;
}

export default function TimetableStrip({ slots, onSlotStatusChange, onSlotClick }: TimetableStripProps) {
  if (!slots || slots.length === 0) {
    return (
      <div
        className="text-muted"
        style={{
          textAlign: "center",
          padding: "1rem",
          fontFamily: "var(--font-hand)",
          fontSize: "1.2rem",
          border: "2px dashed var(--border-sketch)",
          borderRadius: "12px",
        }}
      >
        No time slots for this day ✏️
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="sketchy-table">
        <thead>
          <tr>
            {slots.map((slot) => (
              <th key={slot._id}>
                {slot.startTime} – {slot.endTime}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {slots.map((slot) => (
              <td
                key={slot._id}
                onClick={() => onSlotClick?.(slot)}
                style={{
                  borderLeftColor: slot.status === "completed" ? "var(--success)" :
                    slot.status === "partial" ? "var(--partial)" :
                    slot.status === "failed" ? "var(--failed)" : undefined,
                  borderLeftWidth: slot.status !== "pending" ? 4 : undefined,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-hand)",
                      fontSize: "1.15rem",
                      fontWeight: 600,
                    }}
                  >
                    {slot.title}
                  </span>
                  <div style={{ display: "flex", gap: "0.2rem", flexWrap: "wrap", justifyContent: "center" }}>
                    {slot.tags?.map((tag) => (
                      <span
                        key={tag._id}
                        className="tag-pill"
                        style={{
                          borderColor: tag.color,
                          color: tag.color,
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  <StatusBadge
                    status={slot.status}
                    size="sm"
                    onChange={(newStatus) => onSlotStatusChange?.(slot._id, newStatus)}
                  />
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
