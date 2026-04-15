"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import TimetableStrip from "@/components/TimetableStrip";
import KanbanBoard from "@/components/KanbanBoard";
import AddTodoModal from "@/components/AddTodoModal";
import TimetableEditor from "@/components/TimetableEditor";
import AddColumnModal from "@/components/AddColumnModal";
import ContributeModal from "@/components/ContributeModal";
import TagManager from "@/components/TagManager";

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
  templateId?: string;
  _template?: boolean;
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

interface SchedulePresetOption {
  _id: string;
  name: string;
  scope: "everyday" | "custom";
  slots: { startTime: string; endTime: string; title: string; description: string }[];
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
  const [addModal, setAddModal] = useState<{ categoryId: string; categoryName: string; date: string; dayOfWeek: number } | null>(null);
  const [timetableEditor, setTimetableEditor] = useState<{ date: string; dayOfWeek: number; slots: TimeSlot[] } | null>(null);
  const [addColumnModal, setAddColumnModal] = useState<{ date: string; dayOfWeek: number; categories: Category[] } | null>(null);
  const [showContribute, setShowContribute] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [editModal, setEditModal] = useState<{ todo: TodoItem; categoryId: string; categoryName: string; date: string } | null>(null);
  const [schedulePresets, setSchedulePresets] = useState<SchedulePresetOption[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const daysRef = useRef<DayData[]>([]);
  daysRef.current = days;
  const loadingMoreRef = useRef(false);
  loadingMoreRef.current = loadingMore;
  const hasMoreRef = useRef(true);
  hasMoreRef.current = hasMore;
  const accountStartDateRef = useRef<string | null>(null);
  accountStartDateRef.current = accountStartDate;

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

  // Helper: fetch days and filter by account start date
  const refreshDays = useCallback(async () => {
    const result = await fetchDays();
    let filtered = result.days;
    const start = accountStartDateRef.current;
    if (start) {
      filtered = filtered.filter((d: DayData) => d.date >= start);
    }
    setDays(filtered);
    setAllCategories(result.allCategories);
    if (start && filtered.length < result.days.length) setHasMore(false);
  }, [fetchDays]);

  // Initial load — fetch account date first, then days (so we can filter from join date)
  useEffect(() => {
    (async () => {
      setLoading(true);
      setDays([]);
      setHasMore(true);

      // Fetch account start date first
      let startDate: string | null = null;
      try {
        const meRes = await fetch("/api/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.success && meData.data.createdAt) {
            // Convert ISO timestamp to local date (avoids UTC timezone offset bug)
            const d = new Date(meData.data.createdAt);
            startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            setAccountStartDate(startDate);
          }
        }
      } catch {}

      // Fetch schedule presets for TimetableEditor selector
      fetch("/api/schedule-presets").then(async (r) => {
        if (r.ok) {
          const d = await r.json();
          if (d.success) setSchedulePresets(d.data.map((p: Record<string, unknown>) => ({ _id: p._id, name: p.name, scope: p.scope, slots: p.slots })));
        }
      }).catch(() => {});

      const result = await fetchDays();
      let filteredDays = result.days;

      // Filter: only show days >= account creation date
      if (startDate) {
        filteredDays = filteredDays.filter((d: DayData) => d.date >= startDate!);
        if (filteredDays.length < result.days.length) setHasMore(false);
      }

      setDays(filteredDays);
      setAllCategories(result.allCategories);
      if (filteredDays.length < 7 && startDate) setHasMore(false);
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

  // ===== Helper: materialize a virtual template todo into a real todo =====
  const materializeTemplateTodo = async (todo: TodoItem, date: string): Promise<TodoItem | null> => {
    try {
      const res = await fetch("/api/todos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: todo.title, description: todo.description,
          category: todo.category._id, date, tags: todo.tags.map((t) => t._id),
          templateId: todo.templateId,
        }),
      });
      if (!res.ok) return null;
      const result = await res.json();
      return result.success ? result.data : null;
    } catch { return null; }
  };

  // ===== OPTIMISTIC: Status change =====
  const handleTodoStatusChange = async (todoId: string, newStatus: string) => {
    // Check if this is a virtual template todo
    const isVirtual = todoId.startsWith("tmpl_");
    if (isVirtual) {
      // Find the virtual todo and its date
      let virtualTodo: TodoItem | null = null;
      let todoDate = "";
      for (const day of days) {
        const found = day.todos.find((t) => t._id === todoId);
        if (found) { virtualTodo = found; todoDate = day.date; break; }
      }
      if (!virtualTodo || !todoDate) return;

      // Optimistic update
      const oldDays = days;
      setDays((prev) => prev.map((day) => ({
        ...day, todos: day.todos.map((t) => t._id === todoId ? { ...t, status: newStatus as TodoItem["status"] } : t),
      })));

      // Materialize and update status
      const realTodo = await materializeTemplateTodo(virtualTodo, todoDate);
      if (!realTodo) { setDays(oldDays); return; }

      const statusRes = await fetch(`/api/todos/${realTodo._id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!statusRes.ok) { setDays(oldDays); return; }
      const statusResult = await statusRes.json();
      if (statusResult.success) {
        // Replace virtual todo with real one
        setDays((prev) => prev.map((day) => day.date === todoDate ? {
          ...day, todos: day.todos.map((t) => t._id === todoId ? statusResult.data : t),
        } : day));
      }
      return;
    }

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
    const isVirtual = todoId.startsWith("tmpl_");

    setDays((prev) => prev.map((day) => ({
      ...day, todos: day.todos.map((t) =>
        t._id === todoId
          ? { ...t, category: { _id: targetCat._id, name: targetCat.name, color: targetCat.color }, ...(autoStatus ? { status: autoStatus as TodoItem["status"] } : {}) }
          : t
      ),
    })));

    if (isVirtual) {
      // Find virtual todo and materialize it first
      let virtualTodo: TodoItem | null = null;
      let todoDate = "";
      for (const day of days) {
        const found = day.todos.find((t) => t._id === todoId);
        if (found) { virtualTodo = found; todoDate = day.date; break; }
      }
      if (!virtualTodo || !todoDate) { setDays(oldDays); return; }

      const realTodo = await materializeTemplateTodo(virtualTodo, todoDate);
      if (!realTodo) { setDays(oldDays); return; }

      try {
        const body: Record<string, string> = { categoryId };
        if (autoStatus) body.status = autoStatus;
        const res = await fetch(`/api/todos/${realTodo._id}/move`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error();
        // Refresh to get clean state
        await refreshDays();
      } catch { setDays(oldDays); }
      return;
    }

    try {
      // Single atomic API call for move + status
      const body: Record<string, string> = { categoryId };
      if (autoStatus) body.status = autoStatus;
      const res = await fetch(`/api/todos/${todoId}/move`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
    } catch { setDays(oldDays); }
  };

  const handleAddTodo = async (data: { title: string; description: string; category: string; date: string; tags: string[]; scope?: string; weekdays?: number[] }) => {
    try {
      if (data.scope === "everyday" || data.scope === "custom") {
        // Add item to the active todo preset of this scope, or create a new one
        const presetsRes = await fetch("/api/todo-presets");
        if (!presetsRes.ok) return;
        const presetsData = await presetsRes.json();
        const activePreset = presetsData.success && presetsData.data.find((p: { scope: string; isActive: boolean }) => p.scope === data.scope && p.isActive);

        if (activePreset) {
          // Add item to existing active preset
          const newItem = { title: data.title, description: data.description, category: data.category, tags: data.tags, order: activePreset.items.length };
          const res = await fetch(`/api/todo-presets/${activePreset._id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: [...activePreset.items.map((i: { title: string; description: string; category: { _id: string } | string; tags: ({ _id: string } | string)[]; order: number }) => ({ title: i.title, description: i.description, category: typeof i.category === "object" ? i.category._id : i.category, tags: i.tags.map((t: { _id: string } | string) => typeof t === "object" ? t._id : t), order: i.order })), newItem] }),
          });
          if (!res.ok) return;
        } else {
          // Create a new preset with this single item
          const weekdays = data.scope === "everyday" ? [0, 1, 2, 3, 4, 5, 6] : (data.weekdays || []);
          const res = await fetch("/api/todo-presets", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: `${data.scope} todos`, scope: data.scope, weekdays, items: [{ title: data.title, description: data.description, category: data.category, tags: data.tags, order: 0 }] }),
          });
          if (!res.ok) return;
        }
        await refreshDays();
      } else {
        // Regular single-day todo
        const res = await fetch("/api/todos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
        if (!res.ok) return;
        const result = await res.json();
        if (result.success) {
          setDays((prev) => prev.map((day) => day.date === data.date ? { ...day, todos: [...day.todos, result.data] } : day));
        }
      }
    } catch {}
  };

  // ===== Edit Todo =====
  const handleEditTodo = async (todoId: string, data: { title: string; description: string; tags: string[] }) => {
    const isVirtual = todoId.startsWith("tmpl_");
    if (isVirtual) {
      // Virtual ID format: tmpl_{presetId}_{itemId}_{dateStr}
      const parts = todoId.split("_");
      // parts: ["tmpl", presetId, itemId, dateStr]
      const presetId = parts[1];
      const itemId = parts[2];
      try {
        // Fetch the preset, update the matching item
        const presetRes = await fetch(`/api/todo-presets`);
        if (!presetRes.ok) return;
        const presetData = await presetRes.json();
        const preset = presetData.success && presetData.data.find((p: { _id: string }) => p._id === presetId);
        if (!preset) return;

        const updatedItems = preset.items.map((item: { _id: string; title: string; description: string; category: { _id: string } | string; tags: ({ _id: string } | string)[]; order: number }) => {
          const raw = { title: item.title, description: item.description, category: typeof item.category === "object" ? item.category._id : item.category, tags: item.tags.map((t: { _id: string } | string) => typeof t === "object" ? t._id : t), order: item.order };
          if (item._id === itemId) return { ...raw, title: data.title, description: data.description, tags: data.tags };
          return raw;
        });
        const res = await fetch(`/api/todo-presets/${presetId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: updatedItems }),
        });
        if (!res.ok) return;
        await refreshDays();
      } catch {}
      return;
    }
    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) return;
      const result = await res.json();
      if (result.success) {
        setDays((prev) => prev.map((day) => ({
          ...day, todos: day.todos.map((t) => t._id === todoId ? result.data : t),
        })));
      }
    } catch {}
  };

  // ===== Delete Todo =====
  const handleDeleteTodo = async (todoId: string) => {
    const isVirtual = todoId.startsWith("tmpl_");
    if (isVirtual) {
      // Virtual ID format: tmpl_{presetId}_{itemId}_{dateStr}
      const parts = todoId.split("_");
      const presetId = parts[1];
      const itemId = parts[2];
      try {
        // Fetch preset, remove the matching item
        const presetRes = await fetch(`/api/todo-presets`);
        if (!presetRes.ok) return;
        const presetData = await presetRes.json();
        const preset = presetData.success && presetData.data.find((p: { _id: string }) => p._id === presetId);
        if (!preset) return;

        const updatedItems = preset.items
          .filter((item: { _id: string }) => item._id !== itemId)
          .map((item: { title: string; description: string; category: { _id: string } | string; tags: ({ _id: string } | string)[]; order: number }) => ({
            title: item.title, description: item.description,
            category: typeof item.category === "object" ? item.category._id : item.category,
            tags: item.tags.map((t: { _id: string } | string) => typeof t === "object" ? t._id : t),
            order: item.order,
          }));

        if (updatedItems.length === 0) {
          // Delete the whole preset if no items left
          await fetch(`/api/todo-presets/${presetId}`, { method: "DELETE" });
        } else {
          const res = await fetch(`/api/todo-presets/${presetId}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items: updatedItems }),
          });
          if (!res.ok) return;
        }
        await refreshDays();
      } catch {}
      return;
    }
    try {
      const res = await fetch(`/api/todos/${todoId}`, { method: "DELETE" });
      if (!res.ok) return;
      setDays((prev) => prev.map((day) => ({
        ...day, todos: day.todos.filter((t) => t._id !== todoId),
      })));
    } catch {}
  };

  // ===== Save Timetable =====
  const handleSaveTimetable = async (
    date: string, _dayOfWeek: number,
    slots: { startTime: string; endTime: string; title: string; description: string }[],
    scope: string, weekdays: number[], presetId?: string
  ) => {
    if (scope === "everyday" || scope === "custom") {
      if (presetId) {
        // Update existing preset
        const res = await fetch(`/api/schedule-presets/${presetId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slots, weekdays }),
        });
        if (!res.ok) throw new Error("Failed to update preset");
      } else {
        // Create new preset
        const res = await fetch("/api/schedule-presets", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: `${scope} schedule`, scope, weekdays, slots }),
        });
        if (!res.ok) throw new Error("Failed to create preset");
      }
      // Refresh presets list
      const presetsRes = await fetch("/api/schedule-presets");
      if (presetsRes.ok) {
        const d = await presetsRes.json();
        if (d.success) setSchedulePresets(d.data.map((p: Record<string, unknown>) => ({ _id: p._id, name: p.name, scope: p.scope, slots: p.slots })));
      }
    }
    if (scope === "today") {
      const res = await fetch("/api/timetable/overrides", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, slots }) });
      if (!res.ok) throw new Error("Failed to save override");
    }
    await refreshDays();
    setTimetableEditor(null);
  };

  // ===== Add Column =====
  const handleAddColumn = async (name: string, color: string, scope: string, weekdays: number[], specificDate: string | null) => {
    const res = await fetch("/api/todo-categories", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color, scope, weekdays, specificDate }),
    });
    if (!res.ok) throw new Error("Failed");
    const result = await res.json();
    if (result.success) {
      setAllCategories((prev) => [...prev, result.data]);
      await refreshDays();
    }
  };

  // ===== Remove Column =====
  const handleRemoveColumn = async (id: string) => {
    const res = await fetch(`/api/todo-categories/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed");
    setAllCategories((prev) => prev.filter((c) => c._id !== id));
    await refreshDays();
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
          onClick={() => setShowTagManager(true)}
          style={{ background: "none", border: "2px solid var(--border-sketch)", borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px", padding: "0.3rem 0.8rem", cursor: "pointer", fontFamily: "var(--font-hand)", fontSize: "1.1rem", color: "var(--text)", transition: "all 0.15s ease" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent-light)"; e.currentTarget.style.transform = "rotate(-1deg)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.transform = "none"; }}
        >
          🏷️ Tags
        </button>
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
              setAddModal({ categoryId, categoryName: cat?.name || "", date: day.date, dayOfWeek: day.dayOfWeek });
            }}
            onEditTodo={(todo) => {
              const cat = day.categories.find((c) => c._id === todo.category._id);
              setEditModal({ todo, categoryId: todo.category._id, categoryName: cat?.name || "", date: day.date });
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
        <AddTodoModal categoryId={addModal.categoryId} categoryName={addModal.categoryName} date={addModal.date} dayOfWeek={addModal.dayOfWeek} onClose={() => setAddModal(null)} onAdd={handleAddTodo} />
      )}

      {editModal && (
        <AddTodoModal
          categoryId={editModal.categoryId} categoryName={editModal.categoryName} date={editModal.date}
          editTodo={editModal.todo}
          onClose={() => setEditModal(null)}
          onAdd={handleAddTodo}
          onEdit={handleEditTodo}
          onDelete={handleDeleteTodo}
        />
      )}

      {timetableEditor && (
        <TimetableEditor
          date={timetableEditor.date} dayOfWeek={timetableEditor.dayOfWeek}
          existingSlots={timetableEditor.slots.map((s) => ({ startTime: s.startTime, endTime: s.endTime, title: s.title, description: s.description }))}
          presets={schedulePresets}
          onSave={async (slots, scope, weekdays, presetId) => { await handleSaveTimetable(timetableEditor.date, timetableEditor.dayOfWeek, slots, scope, weekdays, presetId); }}
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
      {showTagManager && <TagManager onClose={() => setShowTagManager(false)} />}
    </div>
  );
}
