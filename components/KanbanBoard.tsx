"use client";

import { useState } from "react";
import StatusBadge from "@/components/StatusBadge";

interface Tag {
  _id: string;
  name: string;
  color: string;
}

interface TodoItem {
  _id: string;
  title: string;
  description: string;
  status: "pending" | "partial" | "completed" | "failed";
  statusNote: string;
  tags: Tag[];
  category: { _id: string; name: string; color: string };
  order: number;
}

interface Category {
  _id: string;
  name: string;
  color: string;
  order: number;
  scope?: string;
}

interface KanbanBoardProps {
  todos: TodoItem[];
  categories: Category[];
  onStatusChange?: (todoId: string, status: string) => void;
  onMoveTodo?: (todoId: string, categoryId: string, autoStatus?: string) => void;
  onAddTodo?: (categoryId: string) => void;
  onEditTodo?: (todo: TodoItem) => void;
  onAddColumn?: () => void;
}

export default function KanbanBoard({
  todos,
  categories,
  onStatusChange,
  onMoveTodo,
  onAddTodo,
  onEditTodo,
  onAddColumn,
}: KanbanBoardProps) {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  const getTodosForCategory = (catId: string) =>
    todos.filter((t) => t.category?._id === catId).sort((a, b) => a.order - b.order);

  const handleDragStart = (e: React.DragEvent, todoId: string) => {
    e.dataTransfer.setData("todoId", todoId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, catId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(catId);
  };

  const handleDragLeave = () => setDragOverCol(null);

  const handleDrop = (e: React.DragEvent, catId: string, catName: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const todoId = e.dataTransfer.getData("todoId");
    if (todoId && onMoveTodo) {
      const nameLower = catName.toLowerCase();
      let autoStatus: string | undefined;
      if (nameLower === "working") autoStatus = "partial";
      else if (nameLower === "completed") autoStatus = "completed";
      else if (nameLower === "todo") autoStatus = "pending";
      onMoveTodo(todoId, catId, autoStatus);
    }
  };

  return (
    <div className="kanban-board">
      {categories.map((cat) => (
        <div key={cat._id} className="kanban-column">
          <div className="kanban-column-header">
            <span className="dot" style={{ backgroundColor: cat.color }} />
            {cat.name}
            <span className="text-muted" style={{ fontSize: "1rem", marginLeft: "auto" }}>
              {getTodosForCategory(cat._id).length}
            </span>
          </div>

          <div
            className={`kanban-cards ${dragOverCol === cat._id ? "drag-over" : ""}`}
            onDragOver={(e) => handleDragOver(e, cat._id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, cat._id, cat.name)}
          >
            {getTodosForCategory(cat._id).map((todo) => (
              <div
                key={todo._id}
                className="kanban-card"
                draggable
                onDragStart={(e) => handleDragStart(e, todo._id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <StatusBadge
                    status={todo.status}
                    size="sm"
                    onChange={(newStatus) => onStatusChange?.(todo._id, newStatus)}
                  />
                  <span
                    className="card-title"
                    style={{ flex: 1, cursor: onEditTodo ? "pointer" : "default" }}
                    onClick={() => onEditTodo?.(todo)}
                  >
                    {todo.title}
                  </span>
                  {onEditTodo && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditTodo(todo); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.8rem", color: "var(--text-muted)", padding: "0.1rem", opacity: 0.5, transition: "opacity 0.15s" }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = "1"}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = "0.5"}
                      title="Edit task"
                    >
                      ✏️
                    </button>
                  )}
                </div>

                {todo.statusNote && (
                  <p className="text-muted" style={{ fontSize: "0.8rem", margin: 0, fontStyle: "italic" }}>
                    {todo.statusNote}
                  </p>
                )}

                {todo.tags && todo.tags.length > 0 && (
                  <div className="card-meta">
                    {todo.tags.map((tag) => (
                      <span key={tag._id} className="tag-pill" style={{ borderColor: tag.color, color: tag.color }}>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => onAddTodo?.(cat._id)}
              style={{
                background: "none",
                border: "2px dashed var(--border-sketch)",
                borderRadius: "8px",
                padding: "0.4rem",
                cursor: "pointer",
                color: "var(--text-muted)",
                fontFamily: "var(--font-hand)",
                fontSize: "1.1rem",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-light)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              + Add Task
            </button>
          </div>
        </div>
      ))}

      {/* Inline add column — slim column placeholder */}
      {onAddColumn && (
        <button
          onClick={onAddColumn}
          title="Add column"
          className="kanban-add-column"
        >
          <span style={{ fontSize: "1.3rem" }}>+</span>
        </button>
      )}
    </div>
  );
}
