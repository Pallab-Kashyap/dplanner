"use client";

import { useState, useEffect } from "react";

interface TimeSlotInput {
  startTime: string;
  endTime: string;
  title: string;
  description: string;
}

interface PresetData {
  _id: string;
  name: string;
  scope: "everyday" | "custom";
  weekdays: number[];
  slots: TimeSlotInput[];
  isActive: boolean;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ScheduleManager() {
  const [presets, setPresets] = useState<PresetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editSlots, setEditSlots] = useState<TimeSlotInput[]>([]);
  const [editName, setEditName] = useState("");
  const [editWeekdays, setEditWeekdays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState<"everyday" | "custom" | null>(null);

  const fetchPresets = async () => {
    try {
      const res = await fetch("/api/schedule-presets");
      if (res.ok) {
        const data = await res.json();
        if (data.success) setPresets(data.data || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchPresets(); }, []);

  const everydayPresets = presets.filter((p) => p.scope === "everyday");
  const customPresets = presets.filter((p) => p.scope === "custom");

  const handleExpand = (preset: PresetData) => {
    if (expandedId === preset._id) {
      setExpandedId(null);
      setCreating(null);
      return;
    }
    setExpandedId(preset._id);
    setCreating(null);
    setEditName(preset.name);
    setEditSlots(preset.slots.map((s) => ({ startTime: s.startTime, endTime: s.endTime, title: s.title, description: s.description })));
    setEditWeekdays(preset.weekdays);
  };

  const startCreate = (scope: "everyday" | "custom") => {
    setCreating(scope);
    setExpandedId(null);
    setEditName("");
    setEditSlots([{ startTime: "09:00", endTime: "10:00", title: "", description: "" }]);
    setEditWeekdays(scope === "everyday" ? [0, 1, 2, 3, 4, 5, 6] : []);
  };

  const addSlot = () => {
    const lastSlot = editSlots[editSlots.length - 1];
    const nextStart = lastSlot ? lastSlot.endTime : "09:00";
    const [h, m] = nextStart.split(":").map(Number);
    const nextEnd = `${String(Math.min(h + 1, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    setEditSlots([...editSlots, { startTime: nextStart, endTime: nextEnd, title: "", description: "" }]);
  };

  const removeSlot = (idx: number) => setEditSlots(editSlots.filter((_, i) => i !== idx));

  const updateSlot = (idx: number, field: keyof TimeSlotInput, value: string) => {
    setEditSlots(editSlots.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const toggleDay = (day: number) => {
    setEditWeekdays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const handleActivate = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/schedule-presets/${id}/activate`, { method: "PATCH" });
      if (res.ok) await fetchPresets();
    } catch {}
    setSaving(false);
  };

  const handleSave = async () => {
    const validSlots = editSlots.filter((s) => s.title.trim());
    if (validSlots.length === 0) return;
    setSaving(true);

    if (creating) {
      if (!editName.trim()) { setSaving(false); return; }
      try {
        const res = await fetch("/api/schedule-presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim(), scope: creating, weekdays: editWeekdays, slots: validSlots }),
        });
        if (res.ok) { setCreating(null); await fetchPresets(); }
      } catch {}
    } else if (expandedId) {
      try {
        const res = await fetch(`/api/schedule-presets/${expandedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim(), weekdays: editWeekdays, slots: validSlots }),
        });
        if (res.ok) { setExpandedId(null); await fetchPresets(); }
      } catch {}
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/schedule-presets/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (expandedId === id) setExpandedId(null);
        await fetchPresets();
      }
    } catch {}
    setSaving(false);
  };

  if (loading) return <p className="text-muted" style={{ textAlign: "center", fontSize: "0.9rem" }}>Loading...</p>;

  const renderSlotEditor = (scope: "everyday" | "custom") => (
    <div style={{ padding: "0.5rem", borderLeft: "2px solid var(--border-sketch)", marginLeft: "0.5rem", marginTop: "0.3rem" }}>
      <input
        className="sketchy-input"
        placeholder="Preset name"
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        style={{ width: "100%", padding: "0.3rem 0.5rem", fontSize: "0.95rem", marginBottom: "0.4rem" }}
        autoFocus
      />

      {scope === "custom" && (
        <div style={{ display: "flex", gap: "0.2rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
          {DAY_NAMES.map((name, i) => (
            <button key={i} type="button" onClick={() => toggleDay(i)} style={{ padding: "0.15rem 0.4rem", borderRadius: "6px", border: "2px solid var(--border-sketch)", background: editWeekdays.includes(i) ? "var(--accent)" : "var(--bg)", color: editWeekdays.includes(i) ? "#3D3229" : "var(--text)", cursor: "pointer", fontFamily: "var(--font-hand)", fontSize: "0.8rem", fontWeight: 600 }}>{name}</button>
          ))}
        </div>
      )}

      {editSlots.map((slot, idx) => (
        <div key={idx} style={{ display: "flex", gap: "0.3rem", alignItems: "center", marginBottom: "0.3rem" }}>
          <input type="time" className="sketchy-input" style={{ width: 85, padding: "0.2rem", fontSize: "0.85rem" }} value={slot.startTime} onChange={(e) => updateSlot(idx, "startTime", e.target.value)} disabled={saving} />
          <span className="text-muted" style={{ fontSize: "0.8rem" }}>-</span>
          <input type="time" className="sketchy-input" style={{ width: 85, padding: "0.2rem", fontSize: "0.85rem" }} value={slot.endTime} onChange={(e) => updateSlot(idx, "endTime", e.target.value)} disabled={saving} />
          <input className="sketchy-input" placeholder="Task" style={{ flex: 1, padding: "0.2rem 0.4rem", fontSize: "0.85rem", minWidth: 0 }} value={slot.title} onChange={(e) => updateSlot(idx, "title", e.target.value)} disabled={saving} />
          <button type="button" onClick={() => removeSlot(idx)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: "var(--failed)", padding: "0.1rem", flexShrink: 0 }}>✗</button>
        </div>
      ))}

      <button type="button" onClick={addSlot} disabled={saving} style={{ width: "100%", background: "none", border: "1px dashed var(--border-sketch)", borderRadius: "6px", padding: "0.25rem", cursor: "pointer", color: "var(--text-muted)", fontFamily: "var(--font-hand)", fontSize: "0.9rem", marginBottom: "0.4rem" }}>
        + Add Slot
      </button>

      <div style={{ display: "flex", gap: "0.3rem", justifyContent: "flex-end" }}>
        <button onClick={() => { setExpandedId(null); setCreating(null); }} className="sketchy-btn sketchy-btn-outline" style={{ padding: "0.2rem 0.5rem", fontSize: "0.85rem" }}>Cancel</button>
        <button onClick={handleSave} className="sketchy-btn" disabled={saving || !editName.trim()} style={{ padding: "0.2rem 0.5rem", fontSize: "0.85rem", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );

  const renderPresetList = (list: PresetData[], scope: "everyday" | "custom") => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
      {list.map((preset) => (
        <div key={preset._id}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.6rem", background: expandedId === preset._id ? "var(--accent-light)" : "var(--bg)", border: "1px solid var(--border-sketch)", borderRadius: "8px" }}>
            <button
              onClick={() => handleActivate(preset._id)}
              disabled={saving}
              title={preset.isActive ? "Active" : "Click to activate"}
              style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid var(--border-sketch)", background: preset.isActive ? "var(--accent)" : "var(--bg)", cursor: "pointer", padding: 0, flexShrink: 0 }}
            />
            <button onClick={() => handleExpand(preset)} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-hand)", fontSize: "1rem", fontWeight: 600, color: "var(--text)", textAlign: "left", padding: 0 }}>
              {preset.name}
            </button>
            <span className="text-muted" style={{ fontSize: "0.8rem", flexShrink: 0 }}>
              {preset.slots.length} slot{preset.slots.length !== 1 ? "s" : ""}
              {scope === "custom" && ` · ${DAY_NAMES.filter((_, i) => preset.weekdays.includes(i)).join(", ")}`}
            </span>
            <button onClick={() => handleDelete(preset._id)} disabled={saving} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", color: "var(--failed)", flexShrink: 0 }}>🗑️</button>
          </div>
          {expandedId === preset._id && renderSlotEditor(scope)}
        </div>
      ))}

      {creating === scope && renderSlotEditor(scope)}

      {creating !== scope && (
        <button onClick={() => startCreate(scope)} disabled={saving} style={{ width: "100%", background: "none", border: "2px dashed var(--border-sketch)", borderRadius: "8px", padding: "0.4rem", cursor: "pointer", color: "var(--text-muted)", fontFamily: "var(--font-hand)", fontSize: "0.95rem" }}>
          + New {scope === "everyday" ? "Everyday" : "Custom"} Schedule
        </button>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <h3 style={{ fontFamily: "var(--font-hand)", fontSize: "1.2rem", marginBottom: "0.4rem" }}>Everyday Schedules</h3>
        <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "0.4rem" }}>Applies to all days. Only one can be active.</p>
        {renderPresetList(everydayPresets, "everyday")}
      </div>

      <div>
        <h3 style={{ fontFamily: "var(--font-hand)", fontSize: "1.2rem", marginBottom: "0.4rem" }}>Custom Schedules</h3>
        <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "0.4rem" }}>Applies to specific days. Only one can be active.</p>
        {renderPresetList(customPresets, "custom")}
      </div>
    </div>
  );
}
