"use client";

import { useState } from "react";

interface TimeSlotInput {
  startTime: string;
  endTime: string;
  title: string;
  description: string;
}

type ScheduleScope = "today" | "everyday" | "custom";

interface TimetableEditorProps {
  date: string;
  dayOfWeek: number;
  existingSlots: TimeSlotInput[];
  onSave: (slots: TimeSlotInput[], scope: ScheduleScope, weekdays: number[]) => Promise<void>;
  onClose: () => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function TimetableEditor({
  date,
  dayOfWeek,
  existingSlots,
  onSave,
  onClose,
}: TimetableEditorProps) {
  const [slots, setSlots] = useState<TimeSlotInput[]>(
    existingSlots.length > 0
      ? existingSlots
      : [{ startTime: "09:00", endTime: "10:00", title: "", description: "" }]
  );
  const [scope, setScope] = useState<ScheduleScope>("today");
  const [selectedDays, setSelectedDays] = useState<number[]>([dayOfWeek]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addSlot = () => {
    const lastSlot = slots[slots.length - 1];
    const nextStart = lastSlot ? lastSlot.endTime : "09:00";
    const [h, m] = nextStart.split(":").map(Number);
    const nextEnd = `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    setSlots([...slots, { startTime: nextStart, endTime: nextEnd, title: "", description: "" }]);
  };

  const removeSlot = (idx: number) => setSlots(slots.filter((_, i) => i !== idx));

  const updateSlot = (idx: number, field: keyof TimeSlotInput, value: string) => {
    setSlots(slots.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validSlots = slots.filter((s) => s.title.trim());
    if (validSlots.length === 0) { setError("Add at least one slot"); return; }
    setSaving(true);
    setError("");
    try {
      const weekdays = scope === "custom" ? selectedDays : scope === "everyday" ? [0,1,2,3,4,5,6] : [dayOfWeek];
      await onSave(validSlots, scope, weekdays);
    } catch {
      setError("Failed to save. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={saving ? undefined : onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h2 style={{ fontSize: "1.6rem", marginBottom: "0.3rem" }}>✏️ Edit Schedule</h2>
        <p className="text-muted" style={{ marginBottom: "0.8rem", fontSize: "0.95rem" }}>
          {date} · {DAY_NAMES_FULL[dayOfWeek]}
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {slots.map((slot, idx) => (
            <div
              key={idx}
              className="timetable-slot-row"
              style={{
                display: "flex",
                gap: "0.4rem",
                alignItems: "center",
                background: "var(--bg)",
                padding: "0.5rem",
                borderRadius: "8px",
                border: "1px solid var(--border-sketch)",
              }}
            >
              <div className="timetable-time-group" style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
                <input type="time" className="sketchy-input" style={{ width: 100, padding: "0.3rem" }} value={slot.startTime} onChange={(e) => updateSlot(idx, "startTime", e.target.value)} disabled={saving} />
                <span className="text-muted">–</span>
                <input type="time" className="sketchy-input" style={{ width: 100, padding: "0.3rem" }} value={slot.endTime} onChange={(e) => updateSlot(idx, "endTime", e.target.value)} disabled={saving} />
              </div>
              <input className="sketchy-input" placeholder="Task name" style={{ flex: 1, padding: "0.3rem 0.5rem", minWidth: 0 }} value={slot.title} onChange={(e) => updateSlot(idx, "title", e.target.value)} disabled={saving} />
              <button type="button" onClick={() => removeSlot(idx)} disabled={saving} style={{ background: "none", border: "none", cursor: saving ? "not-allowed" : "pointer", fontSize: "1.2rem", color: "var(--failed)", padding: "0.2rem", opacity: saving ? 0.5 : 1, flexShrink: 0 }}>✗</button>
            </div>
          ))}

          <button type="button" onClick={addSlot} disabled={saving} style={{ background: "none", border: "2px dashed var(--border-sketch)", borderRadius: "8px", padding: "0.4rem", cursor: saving ? "not-allowed" : "pointer", color: "var(--text-muted)", fontFamily: "var(--font-hand)", fontSize: "1.1rem", opacity: saving ? 0.5 : 1 }}>
            + Add Time Slot
          </button>

          {/* Schedule scope */}
          <div style={{ marginTop: "0.3rem" }}>
            <p style={{ fontSize: "0.95rem", fontFamily: "var(--font-hand)", fontWeight: 600, marginBottom: "0.2rem" }}>Apply to:</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {(["today", "everyday", "custom"] as ScheduleScope[]).map((s) => (
                <label key={s} style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer", fontSize: "0.95rem" }}>
                  <input type="radio" name="scope" checked={scope === s} onChange={() => setScope(s)} disabled={saving} />
                  <span>{s === "today" ? "Just today" : s === "everyday" ? "Everyday" : "Custom"}</span>
                </label>
              ))}
            </div>

            {scope === "custom" && (
              <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
                {DAY_NAMES.map((name, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)} disabled={saving} style={{ padding: "0.2rem 0.5rem", borderRadius: "6px", border: "2px solid var(--border-sketch)", background: selectedDays.includes(i) ? "var(--accent)" : "var(--bg)", color: selectedDays.includes(i) ? "#3D3229" : "var(--text)", cursor: "pointer", fontFamily: "var(--font-hand)", fontSize: "0.9rem", fontWeight: 600 }}>{name}</button>
                ))}
              </div>
            )}
          </div>

          {error && <p style={{ color: "var(--failed)", margin: 0, fontSize: "0.9rem" }}>{error}</p>}

          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end", marginTop: "0.2rem" }}>
            <button type="button" className="sketchy-btn sketchy-btn-outline" onClick={onClose} disabled={saving} style={{ padding: "0.3rem 0.8rem", fontSize: "1.1rem" }}>Cancel</button>
            <button type="submit" className="sketchy-btn" disabled={saving} style={{ opacity: saving ? 0.7 : 1, padding: "0.3rem 0.8rem", fontSize: "1.1rem" }}>
              {saving ? <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}><span className="loading-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Saving...</span> : "Save ✓"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
