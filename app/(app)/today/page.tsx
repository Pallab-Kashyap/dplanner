"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import TimetableStrip from "@/components/TimetableStrip";
import KanbanBoard from "@/components/KanbanBoard";
import AddTodoModal from "@/components/AddTodoModal";
import TimetableEditor from "@/components/TimetableEditor";
import AddColumnModal from "@/components/AddColumnModal";
import ContributeModal from "@/components/ContributeModal";

interface Tag { _id: string; name: string; color: string; }

interface TimeSlot {
  _id: string; startTime: string; endTime: string; title: string;
  description: string; status: "pending" | "partial" | "completed" | "failed";
  statusNote: string; tags: Tag[];
}

interface TodoItem {
  _id: string; title: string; description: string;
  status: "pending" | "partial" | "completed" | "failed";
  statusNote: string; tags: Tag[];
  category: { _id: string; name: string; color: string };
  order: number;
}

interface Category {
  _id: string; name: string; color: string; order: number;
  scope?: string; weekdays?: number[]; specificDate?: string;
}

interface DayData {
  date: string; dayOfWeek: number; slots: TimeSlot[];
  todos: TodoItem[]; source: string; categories: Category[];
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00.000Z");
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

function formatFullDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00.000Z");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function isToday(dateStr: string) {
  const today = new Date();
  return dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function getTodayStr() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

export default function TodayPage() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  const [days, setDays] = useState<DayData[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [accountStartDate, setAccountStartDate] = useState<string | null>(null);
  const [addModal, setAddModal] = useState<{ categoryId: string; categoryName: string; date: string } | null>(null);
  const [timetableEditor, setTimetableEditor] = useState<{ date: string; dayOfWeek: number; slots: TimeSlot[] } | null>(null);
  const [addColumnModal, setAddColumnModal] = useState<{ date: string; dayOfWeek: number; categories: Category[] } | null>(null);
  const [showContribute, setShowContribute] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const daysRef = useRef<DayData[]>([]);
  daysRef.current = days;
  const loadingMoreRef = useRef(false);
  loadingMoreRef.current = loadingMore;
  const hasMoreRef = useRef(true);
  hasMoreRef.current = hasMore;
  const accountStartDateRef = useRef<string | null>(null);
  accountStartDateRef.current = accountStartDate;

  // Fetch user account start
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          if (data.success) setAccountStartDate(data.data.createdAt);
        }
      } catch {}
    })();
  }, []);

  const fetchDays = useCallback(async (beforeDate?: string) => {
    const startDate = beforeDate || dateParam || getTodayStr();
    const params = new URLSearchParams({ limit: dateParam && !beforeDate ? "1" : "7", before: startDate });

    try {
      const res = await fetch(`/api/days?${params}`);
      if (!res.ok) return { days: [], allCategories: [] };
      const data = await res.json();
      if (data.success) return { days: data.data.days, allCategories: data.data.allCategories };
    } catch (err) {
      console.error("Error fetching days:", err);
    }
    return { days: [], allCategories: [] };
  }, [dateParam]);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      setDays([]);
      setHasMore(true);
      const result = await fetchDays();
      setDays(result.days);
      setAllCategories(result.allCategories);
      if (result.days.length < 7) setHasMore(!dateParam);
      setLoading(false);
    })();
  }, [fetchDays, dateParam]);

  // Infinite scroll — uses refs to avoid re-creating observer on every days change
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && !loadingMoreRef.current && hasMoreRef.current) {
          setLoadingMore(true);
          const currentDays = daysRef.current;
          const startDate = accountStartDateRef.current;
          const oldestDay = currentDays[currentDays.length - 1];
          if (oldestDay) {
            if (startDate && oldestDay.date <= startDate) {
              setHasMore(false); setLoadingMore(false); return;
            }
            const d = new Date(oldestDay.date + "T00:00:00.000Z");
            d.setUTCDate(d.getUTCDate() - 1);
            const beforeStr = d.toISOString().split("T")[0];
            const result = await fetchDays(beforeStr);
            if (result.days.length === 0) { setHasMore(false); }
            else {
              let newDays = result.days;
              if (startDate) {
                newDays = newDays.filter((day: DayData) => day.date >= startDate);
                if (newDays.length < result.days.length) setHasMore(false);
              }
              setDays((prev) => [...prev, ...newDays]);
              if (result.days.length < 7) setHasMore(false);
            }
          }
          setLoadingMore(false);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchDays]); // Only depends on fetchDays (stable via useCallback)

  // ===== OPTIMISTIC: Status change =====
  const handleTodoStatusChange = async (todoId: string, newStatus: string) => {
    const oldDays = days;
    setDays((prev) => prev.map((day) => ({
      ...day, todos: day.todos.map((t) => t._id === todoId ? { ...t, status: newStatus as TodoItem["status"] } : t),
    })));
    try {
      const res = await fetch(`/api/todos/${todoId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) throw new Error();
    } catch { setDays(oldDays); }
  };

  const handleSlotStatusChange = async (date: string, slotId: string, status: string) => {
    const day = days.find((d) => d.date === date);
    if (!day) return;
    const oldDays = days;
    const updatedSlots = day.slots.map((s) => s._id === slotId ? { ...s, status: status as TimeSlot["status"] } : s);
    setDays((prev) => prev.map((d) => (d.date === date ? { ...d, slots: updatedSlots } : d)));
    try {
      const res = await fetch("/api/timetable/overrides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, slots: updatedSlots }) });
      if (!res.ok) throw new Error();
    } catch { setDays(oldDays); }
  };

  // ===== OPTIMISTIC: Move todo with auto-status (atomic single API call) =====
  const handleMoveTodo = async (todoId: string, categoryId: string, autoStatus?: string) => {
    const targetCat = allCategories.find((c) => c._id === categoryId);
    if (!targetCat) return;
    const oldDays = days;

    setDays((prev) => prev.map((day) => ({
      ...day, todos: day.todos.map((t) =>
        t._id === todoId
          ? { ...t, category: { _id: targetCat._id, name: targetCat.name, color: targetCat.color }, ...(autoStatus ? { status: autoStatus as TodoItem["status"] } : {}) }
          : t
      ),
    })));

    try {
      // Single atomic API call for move + status
      const body: Record<string, string> = { categoryId };
      if (autoStatus) body.status = autoStatus;
      const res = await fetch(`/api/todos/${todoId}/move`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
    } catch { setDays(oldDays); }
  };

  const handleAddTodo = async (data: { title: string; description: string; category: string; date: string }) => {
    try {
      const res = await fetch("/api/todos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) return;
      const result = await res.json();
      if (result.success) {
        setDays((prev) => prev.map((day) => day.date === data.date ? { ...day, todos: [...day.todos, result.data] } : day));
      }
    } catch {}
  };

  // ===== Save Timetable =====
  const handleSaveTimetable = async (
    date: string, dayOfWeek: number,
    slots: { startTime: string; endTime: string; title: string; description: string }[],
    scope: string, weekdays: number[]
  ) => {
    if (scope === "everyday" || scope === "custom") {
      // Save as template for each selected weekday
      for (const wd of weekdays) {
        const res = await fetch("/api/timetable/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dayOfWeek: wd, slots }) });
        if (!res.ok) throw new Error("Failed to save template");
      }
    }
    // Only save override when scope is "today" (not for everyday/custom — template is sufficient)
    if (scope === "today") {
      const res = await fetch("/api/timetable/overrides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, slots }) });
      if (!res.ok) throw new Error("Failed to save override");
    }
    const result = await fetchDays();
    setDays(result.days);
    setTimetableEditor(null);
  };

  // ===== Add Column =====
  const handleAddColumn = async (name: string, color: string, scope: string, weekdays: number[], specificDate: string | null) => {
    const order = allCategories.length;
    const res = await fetch("/api/todo-categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color, order, scope, weekdays, specificDate }),
    });
    if (!res.ok) throw new Error("Failed");
    const result = await res.json();
    if (result.success) {
      setAllCategories((prev) => [...prev, result.data]);
      // Refresh days to get updated per-day categories
      const daysResult = await fetchDays();
      setDays(daysResult.days);
    }
  };

  // ===== Remove Column =====
  const handleRemoveColumn = async (id: string) => {
    const res = await fetch(`/api/todo-categories/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed");
    setAllCategories((prev) => prev.filter((c) => c._id !== id));
    const daysResult = await fetchDays();
    setDays(daysResult.days);
    // Update modal's list too
    setAddColumnModal((prev) => prev ? { ...prev, categories: prev.categories.filter((c) => c._id !== id) } : null);
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: "60vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="loading-spinner" style={{ margin: "0 auto 1rem" }} />
          <p style={{ fontFamily: "var(--font-hand)", fontSize: "1.5rem" }}>Loading your planner... ✏️</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Top action bar */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginBottom: "0.8rem", flexWrap: "wrap" }}>
        {dateParam && (
          <a href="/today" style={{ fontFamily: "var(--font-hand)", fontSize: "1.2rem", color: "var(--accent-hover)", marginRight: "auto" }}>
            ← Back to today · {formatFullDate(dateParam)}
          </a>
        )}
        <button
          onClick={() => setShowContribute(true)}
          style={{ background: "none", border: "2px solid var(--border-sketch)", borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px", padding: "0.3rem 0.8rem", cursor: "pointer", fontFamily: "var(--font-hand)", fontSize: "1.1rem", color: "var(--text)", transition: "all 0.15s ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-light)"; e.currentTarget.style.transform = "rotate(-1deg)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.transform = "none"; }}
        >
          💡 Contribute
        </button>
        <a
          href={process.env.NEXT_PUBLIC_BUYMEACOFFEE_URL || "https://buymeacoffee.com"}
          target="_blank"
          rel="noopener noreferrer"
          style={{ background: "none", border: "2px solid var(--border-sketch)", borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px", padding: "0.3rem 0.8rem", cursor: "pointer", fontFamily: "var(--font-hand)", fontSize: "1.1rem", color: "var(--text)", textDecoration: "none", transition: "all 0.15s ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-light)"; e.currentTarget.style.transform = "rotate(-1deg)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.transform = "none"; }}
        >
          ☕ Buy me a coffee
        </a>
      </div>

      {days.map((day) => (
        <div key={day.date} className="day-section">
          <div className="day-header">
            <span>{formatDate(day.date)}</span>
            <span className="day-label">
              {isToday(day.date) ? "Today ✨" : DAY_NAMES[day.dayOfWeek]}
            </span>
            <button
              onClick={() => setTimetableEditor({ date: day.date, dayOfWeek: day.dayOfWeek, slots: day.slots })}
              style={{ background: "none", border: "2px solid var(--border-sketch)", borderRadius: "8px", padding: "0.2rem 0.6rem", cursor: "pointer", fontFamily: "var(--font-hand)", fontSize: "1rem", color: "var(--text-muted)", marginLeft: "auto" }}
            >
              ✏️ Edit Schedule
            </button>
          </div>

          <div className="mb-2">
            <TimetableStrip slots={day.slots} onSlotStatusChange={(slotId, status) => handleSlotStatusChange(day.date, slotId, status)} />
          </div>

          <KanbanBoard
            todos={day.todos}
            categories={day.categories}
            onStatusChange={handleTodoStatusChange}
            onMoveTodo={handleMoveTodo}
            onAddTodo={(categoryId) => {
              const cat = day.categories.find((c) => c._id === categoryId);
              setAddModal({ categoryId, categoryName: cat?.name || "", date: day.date });
            }}
            onAddColumn={() => setAddColumnModal({ date: day.date, dayOfWeek: day.dayOfWeek, categories: day.categories })}
          />
        </div>
      ))}

      <div ref={sentinelRef} style={{ height: 1 }} />
      {loadingMore && <div className="flex-center" style={{ padding: "2rem" }}><div className="loading-spinner" /></div>}

      {!hasMore && days.length > 0 && accountStartDate && (
        <div style={{ textAlign: "center", padding: "1.5rem", marginTop: "1rem" }}>
          <div className="sketchy-card" style={{ display: "inline-block", padding: "1rem 2rem" }}>
            <p style={{ fontFamily: "var(--font-hand)", fontSize: "1.5rem", margin: 0 }}>🌱 You started planning your days on</p>
            <p style={{ fontFamily: "var(--font-hand)", fontSize: "2rem", color: "var(--accent-hover)", margin: "0.3rem 0 0" }}>{formatFullDate(accountStartDate)}</p>
          </div>
        </div>
      )}

      {addModal && (
        <AddTodoModal categoryId={addModal.categoryId} categoryName={addModal.categoryName} date={addModal.date} onClose={() => setAddModal(null)} onAdd={handleAddTodo} />
      )}

      {timetableEditor && (
        <TimetableEditor
          date={timetableEditor.date} dayOfWeek={timetableEditor.dayOfWeek}
          existingSlots={timetableEditor.slots.map((s) => ({ startTime: s.startTime, endTime: s.endTime, title: s.title, description: s.description }))}
          onSave={async (slots, scope, weekdays) => { await handleSaveTimetable(timetableEditor.date, timetableEditor.dayOfWeek, slots, scope, weekdays); }}
          onClose={() => setTimetableEditor(null)}
        />
      )}

      {addColumnModal && (
        <AddColumnModal
          date={addColumnModal.date} dayOfWeek={addColumnModal.dayOfWeek}
          currentCategories={addColumnModal.categories}
          onAdd={handleAddColumn}
          onRemove={handleRemoveColumn}
          onClose={() => setAddColumnModal(null)}
        />
      )}

      {showContribute && <ContributeModal onClose={() => setShowContribute(false)} />}
    </div>
  );
}
