"use client";

import { useState } from "react";
import TagPicker from "./TagPicker";

interface TodoModalProps {
  categoryId: string;
  categoryName: string;
  date: string;
  onClose: () => void;
  onAdd: (data: { title: string; description: string; category: string; date: string; tags: string[] }) => void;
  onEdit?: (todoId: string, data: { title: string; description: string; tags: string[] }) => void;
  onDelete?: (todoId: string) => void;
  editTodo?: { _id: string; title: string; description: string; tags?: { _id: string }[] } | null;
}

export default function TodoModal({
  categoryId,
  categoryName,
  date,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (isEdit && onEdit && editTodo) {
      onEdit(editTodo._id, { title: title.trim(), description, tags: tagIds });
    } else {
      onAdd({ title: title.trim(), description, category: categoryId, date, tags: tagIds });
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
