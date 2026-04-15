"use client";

import { useState } from "react";
import TagPicker from "./TagPicker";

type TodoScope = "today" | "everyday" | "custom";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface TodoModalProps {
  categoryId: string;
  categoryName: string;
  date: string;
  dayOfWeek?: number;
  onClose: () => void;
  onAdd: (data: { title: string; description: string; category: string; date: string; tags: string[]; scope?: TodoScope; weekdays?: number[] }) => void;
  onEdit?: (todoId: string, data: { title: string; description: string; tags: string[] }) => void;
  onDelete?: (todoId: string) => void;
  editTodo?: { _id: string; title: string; description: string; tags?: { _id: string }[]; _template?: boolean } | null;
}

export default function TodoModal({
  categoryId,
  categoryName,
  date,
  dayOfWeek = new Date(date + "T00:00:00.000Z").getUTCDay(),
  onClose,
  onAdd,
  onEdit,
  onDelete,
  editTodo,
}: TodoModalProps) {
  const isEdit = !!editTodo;
  const [title, setTitle] = useState(editTodo?.title || "");
  const [description, setDescription] = useState(editTodo?.description || "");
  const [tagIds, setTagIds] = useState<string[]>(editTodo?.tags?.map((t) => t._id) || []);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [scope, setScope] = useState<TodoScope>("today");
  const [selectedDays, setSelectedDays] = useState<number[]>([dayOfWeek]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (isEdit && onEdit && editTodo) {
      onEdit(editTodo._id, { title: title.trim(), description, tags: tagIds });
    } else {
      onAdd({
        title: title.trim(),
        description,
        category: categoryId,
        date,
        tags: tagIds,
        scope,
        weekdays: scope === "custom" ? selectedDays : scope === "everyday" ? [0, 1, 2, 3, 4, 5, 6] : undefined,
      });
    }
    onClose();
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (onDelete && editTodo) {
      onDelete(editTodo._id);
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>
          {isEdit ? "📝 Edit Task" : `✏️ New Task in ${categoryName}`}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          <input
            className="sketchy-input"
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <textarea
            className="sketchy-textarea"
            placeholder="Notes (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <TagPicker selectedTagIds={tagIds} onChange={setTagIds} />

          {/* Scope selector — only show for new todos, not edits */}
          {!isEdit && (
            <div>
              <p style={{ fontSize: "0.95rem", fontFamily: "var(--font-hand)", fontWeight: 600, marginBottom: "0.2rem" }}>Apply to:</p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {(["today", "everyday", "custom"] as TodoScope[]).map((s) => (
                  <label key={s} style={{ display: "flex", alignItems: "center", gap: "0.25rem", cursor: "pointer", fontSize: "0.95rem" }}>
                    <input type="radio" name="todoScope" checked={scope === s} onChange={() => setScope(s)} />
                    <span>{s === "today" ? "Just today" : s === "everyday" ? "Everyday" : "Custom"}</span>
                  </label>
                ))}
              </div>

              {scope === "custom" && (
                <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
                  {DAY_NAMES.map((name, i) => (
                    <button key={i} type="button" onClick={() => toggleDay(i)} style={{ padding: "0.2rem 0.5rem", borderRadius: "6px", border: "2px solid var(--border-sketch)", background: selectedDays.includes(i) ? "var(--accent)" : "var(--bg)", color: selectedDays.includes(i) ? "#3D3229" : "var(--text)", cursor: "pointer", fontFamily: "var(--font-hand)", fontSize: "0.9rem", fontWeight: 600 }}>{name}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              {isEdit && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="sketchy-btn"
                  style={{
                    background: confirmDelete ? "var(--failed)" : "transparent",
                    color: confirmDelete ? "white" : "var(--failed)",
                    border: "2px solid var(--failed)",
                    padding: "0.3rem 0.8rem",
                    fontSize: "1rem",
                  }}
                >
                  {confirmDelete ? "Confirm Delete" : "Delete"}
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" className="sketchy-btn sketchy-btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="sketchy-btn">
                {isEdit ? "Save ✓" : "Add ✓"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
