"use client";

import { useState } from "react";

interface Category {
  _id: string;
  name: string;
  color: string;
  order: number;
}

interface CategoryManagerProps {
  categories: Category[];
  onAdd: (name: string, color: string) => Promise<void>;
  onEdit: (id: string, name: string, color: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#6b7280", "#f97316", "#a855f7",
];

export default function CategoryManager({
  categories,
  onAdd,
  onEdit,
  onDelete,
  onClose,
}: CategoryManagerProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await onAdd(newName.trim(), newColor);
      setNewName("");
    } catch {}
    setLoading(false);
  };

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return;
    setLoading(true);
    try {
      await onEdit(id, editName.trim(), editColor);
      setEditingId(null);
    } catch {}
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await onDelete(id);
    } catch {}
    setLoading(false);
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat._id);
    setEditName(cat.name);
    setEditColor(cat.color);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 450 }}>
        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.8rem" }}>
          📂 Manage Columns
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
          {categories.map((cat) => (
            <div
              key={cat._id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.4rem 0.6rem",
                background: "var(--bg)",
                borderRadius: "8px",
                border: "1px solid var(--border-sketch)",
              }}
            >
              {editingId === cat._id ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    style={{ width: 28, height: 28, border: "none", cursor: "pointer" }}
                  />
                  <input
                    className="sketchy-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    style={{ flex: 1, padding: "0.2rem 0.4rem" }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleEdit(cat._id)}
                    disabled={loading}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "var(--success)" }}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "var(--text-muted)" }}
                  >
                    ✗
                  </button>
                </>
              ) : (
                <>
                  <span className="dot" style={{ backgroundColor: cat.color, width: 14, height: 14, borderRadius: "50%", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: "var(--font-hand)", fontSize: "1.2rem" }}>{cat.name}</span>
                  <button
                    onClick={() => startEdit(cat)}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", color: "var(--text-muted)" }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(cat._id)}
                    disabled={loading}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", color: "var(--failed)" }}
                  >
                    🗑
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAdd} style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            style={{ width: 28, height: 28, border: "none", cursor: "pointer" }}
          />
          <input
            className="sketchy-input"
            placeholder="New column name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={{ flex: 1, padding: "0.3rem 0.5rem" }}
          />
          <button type="submit" className="sketchy-btn" disabled={loading} style={{ padding: "0.3rem 0.8rem" }}>
            Add
          </button>
        </form>

        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNewColor(c)}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                backgroundColor: c,
                border: newColor === c ? "3px solid var(--text)" : "2px solid var(--border-sketch)",
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button className="sketchy-btn sketchy-btn-outline" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
