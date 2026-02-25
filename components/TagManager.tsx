"use client";

import { useState, useEffect } from "react";

interface Tag {
  _id: string;
  name: string;
  color: string;
}

interface TagManagerProps {
  onClose: () => void;
}

const PRESET_COLORS = ["#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#3b82f6", "#ec4899", "#8b5cf6", "#14b8a6"];

export default function TagManager({ onClose }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTags = async () => {
    try {
      const res = await fetch("/api/tags");
      if (res.ok) {
        const data = await res.json();
        if (data.success) setTags(data.data);
      }
    } catch {}
  };

  useEffect(() => { fetchTags(); }, []);

  const handleCreate = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      });
      if (res.ok) {
        setNewName("");
        await fetchTags();
      }
    } catch {}
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), color: editColor }),
      });
      if (res.ok) {
        setEditingId(null);
        await fetchTags();
      }
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" });
      if (res.ok) await fetchTags();
    } catch {}
    setSaving(false);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <h2 style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>🏷️ Manage Tags</h2>
        <p className="text-muted" style={{ fontSize: "0.85rem", marginBottom: "0.8rem" }}>
          Tags can be used for priority, labels, or any purpose.
        </p>

        {/* Tag list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1rem", maxHeight: 240, overflowY: "auto" }}>
          {tags.map((tag) => (
            <div key={tag._id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.5rem", background: "var(--bg)", borderRadius: "8px", border: "1px solid var(--border-sketch)" }}>
              {editingId === tag._id ? (
                <>
                  <input
                    className="sketchy-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ flex: 1, padding: "0.2rem 0.4rem", fontSize: "0.9rem" }}
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(tag._id)}
                  />
                  <div style={{ display: "flex", gap: "2px" }}>
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        style={{ width: 16, height: 16, borderRadius: "50%", background: c, border: editColor === c ? "2px solid var(--text)" : "2px solid transparent", cursor: "pointer", padding: 0 }}
                      />
                    ))}
                  </div>
                  <button onClick={() => handleUpdate(tag._id)} className="sketchy-btn" style={{ padding: "0.15rem 0.5rem", fontSize: "0.85rem" }}>✓</button>
                  <button onClick={() => setEditingId(null)} className="sketchy-btn sketchy-btn-outline" style={{ padding: "0.15rem 0.5rem", fontSize: "0.85rem" }}>✗</button>
                </>
              ) : (
                <>
                  <span className="tag-pill" style={{ borderColor: tag.color, color: tag.color, background: tag.color + "22" }}>{tag.name}</span>
                  <span style={{ flex: 1 }} />
                  <button onClick={() => { setEditingId(tag._id); setEditName(tag.name); setEditColor(tag.color); }} title="Edit" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", color: "var(--text-muted)" }}>✏️</button>
                  <button onClick={() => handleDelete(tag._id)} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", color: "var(--failed)" }}>🗑️</button>
                </>
              )}
            </div>
          ))}
          {tags.length === 0 && <p className="text-muted" style={{ textAlign: "center", fontSize: "0.9rem" }}>No tags yet. Create one below!</p>}
        </div>

        {/* Create new */}
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <input
            className="sketchy-input"
            placeholder="New tag name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ flex: 1, padding: "0.3rem 0.5rem" }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <div style={{ display: "flex", gap: "2px" }}>
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                style={{ width: 18, height: 18, borderRadius: "50%", background: c, border: newColor === c ? "2px solid var(--text)" : "2px solid transparent", cursor: "pointer", padding: 0 }}
              />
            ))}
          </div>
          <button onClick={handleCreate} className="sketchy-btn" disabled={!newName.trim() || saving} style={{ padding: "0.3rem 0.6rem", fontSize: "1rem" }}>+</button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="sketchy-btn sketchy-btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
