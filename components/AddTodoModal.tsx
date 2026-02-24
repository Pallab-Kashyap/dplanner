"use client";

import { useState } from "react";

interface AddTodoModalProps {
  categoryId: string;
  categoryName: string;
  date: string;
  onClose: () => void;
  onAdd: (data: { title: string; description: string; category: string; date: string }) => void;
}

export default function AddTodoModal({
  categoryId,
  categoryName,
  date,
  onClose,
  onAdd,
}: AddTodoModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), description, category: categoryId, date });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>
          ✏️ New Task in {categoryName}
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
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="sketchy-btn sketchy-btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="sketchy-btn">
              Add ✓
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
