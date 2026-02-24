"use client";

import { useState } from "react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#6b7280", "#f97316", "#a855f7",
];

type AddScope = "today" | "everyday" | "custom";

interface Category {
  _id: string;
  name: string;
  color: string;
  scope?: string;
  isDefault?: boolean;
}

interface AddColumnModalProps {
  date: string;
  dayOfWeek: number;
  currentCategories: Category[];
  onAdd: (name: string, color: string, scope: string, weekdays: number[], specificDate: string | null) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onClose: () => void;
}

export default function AddColumnModal({ date, dayOfWeek, currentCategories, onAdd, onRemove, onClose }: AddColumnModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [scope, setScope] = useState<AddScope>("today");
  const [selectedDays, setSelectedDays] = useState<number[]>([dayOfWeek]);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const toggleDay = (d: number) => {
    setSelectedDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const apiScope = scope === "today" ? "date" : scope === "everyday" ? "everyday" : "weekly";
      const weekdays = scope === "custom" ? selectedDays : scope === "everyday" ? [0,1,2,3,4,5,6] : [];
      const specificDate = scope === "today" ? date : null;
      await onAdd(name.trim(), color, apiScope, weekdays, specificDate);
      setName("");
    } catch {}
    setSaving(false);
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try { await onRemove(id); } catch {}
    setRemovingId(null);
  };

  const removableCategories = currentCategories.filter((c) => !c.isDefault && c.scope !== "permanent");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, width: "92%" }}>
        <h2 style={{ fontSize: "1.6rem", marginBottom: "0.6rem" }}>📂 Day Columns</h2>

        {/* Current non-permanent categories with remove */}
        {removableCategories.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: "0.3rem" }}>Custom columns on this day:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {removableCategories.map((cat) => (
                <div key={cat._id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0.5rem", background: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border-sketch)" }}>
                  <span style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: cat.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: "var(--font-hand)", fontSize: "1.1rem" }}>{cat.name}</span>
                  <button
                    onClick={() => handleRemove(cat._id)}
                    disabled={removingId === cat._id}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: "var(--failed)", opacity: removingId === cat._id ? 0.4 : 1 }}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <hr style={{ border: "none", borderTop: "1px dashed var(--border-sketch)", margin: "0.5rem 0" }} />

        {/* Add new column */}
        <p style={{ fontFamily: "var(--font-hand)", fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.4rem" }}>+ Add new column</p>
        <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: 30, height: 30, border: "none", cursor: "pointer", flexShrink: 0 }} />
            <input className="sketchy-input" placeholder="Column name" value={name} onChange={(e) => setName(e.target.value)} autoFocus style={{ flex: 1 }} />
          </div>

          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
            {PRESET_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: c, border: color === c ? "3px solid var(--text)" : "2px solid var(--border-sketch)", cursor: "pointer", padding: 0 }} />
            ))}
          </div>

          <div>
            <p className="text-muted" style={{ fontSize: "0.9rem", marginBottom: "0.2rem" }}>Show on:</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {(["today", "everyday", "custom"] as AddScope[]).map((s) => (
                <label key={s} style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer", fontSize: "0.95rem" }}>
                  <input type="radio" name="scope" checked={scope === s} onChange={() => setScope(s)} />
                  <span>{s === "today" ? "Just today" : s === "everyday" ? "Everyday" : "Custom"}</span>
                </label>
              ))}
            </div>
            {scope === "custom" && (
              <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
                {DAY_NAMES.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)} style={{ padding: "0.2rem 0.4rem", borderRadius: "6px", border: "2px solid var(--border-sketch)", background: selectedDays.includes(i) ? "var(--accent)" : "var(--bg)", color: selectedDays.includes(i) ? "#3D3229" : "var(--text)", cursor: "pointer", fontFamily: "var(--font-hand)", fontSize: "0.9rem", fontWeight: 600 }}>{d}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
            <button type="button" className="sketchy-btn sketchy-btn-outline" onClick={onClose} style={{ padding: "0.3rem 0.8rem", fontSize: "1.1rem" }}>Close</button>
            <button type="submit" className="sketchy-btn" disabled={saving || !name.trim()} style={{ padding: "0.3rem 0.8rem", fontSize: "1.1rem", opacity: saving || !name.trim() ? 0.5 : 1 }}>
              {saving ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
