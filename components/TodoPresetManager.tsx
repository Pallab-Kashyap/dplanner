"use client";

import { useState, useEffect } from "react";

interface Tag { _id: string; name: string; color: string; }
interface Category { _id: string; name: string; color: string; }

interface PresetItem {
  _id: string;
  title: string;
  description: string;
  category: Category;
  tags: Tag[];
  order: number;
}

interface TodoPresetData {
  _id: string;
  name: string;
  scope: "everyday" | "custom";
  weekdays: number[];
  items: PresetItem[];
  isActive: boolean;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TodoPresetManager() {
  const [presets, setPresets] = useState<TodoPresetData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editWeekdays, setEditWeekdays] = useState<number[]>([]);
  const [editItems, setEditItems] = useState<{ title: string; description: string; categoryId: string; order: number }[]>([]);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState<"everyday" | "custom" | null>(null);

  const fetchPresets = async () => {
    try {
      const [presetsRes, catsRes] = await Promise.all([
        fetch("/api/todo-presets"),
        fetch("/api/categories"),
      ]);
      if (presetsRes.ok) {
        const data = await presetsRes.json();
        if (data.success) setPresets(data.data || []);
      }
      if (catsRes.ok) {
        const data = await catsRes.json();
        if (data.success) setCategories(data.data || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchPresets(); }, []);

  const everydayPresets = presets.filter((p) => p.scope === "everyday");
  const customPresets = presets.filter((p) => p.scope === "custom");

  const handleExpand = (preset: TodoPresetData) => {
    if (expandedId === preset._id) {
      setExpandedId(null);
      setCreating(null);
      return;
    }
    setExpandedId(preset._id);
    setCreating(null);
    setEditName(preset.name);
    setEditWeekdays(preset.weekdays);
    setEditItems(preset.items.map((item) => ({
      title: item.title,
      description: item.description,
      categoryId: item.category?._id || "",
      order: item.order,
    })));
  };

  const startCreate = (scope: "everyday" | "custom") => {
    setCreating(scope);
    setExpandedId(null);
    setEditName("");
    setEditWeekdays(scope === "everyday" ? [0, 1, 2, 3, 4, 5, 6] : []);
    setEditItems([{ title: "", description: "", categoryId: categories[0]?._id || "", order: 0 }]);
  };

  const toggleDay = (day: number) => {
    setEditWeekdays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]);
  };

  const addItem = () => {
    setEditItems([...editItems, { title: "", description: "", categoryId: categories[0]?._id || "", order: editItems.length }]);
  };

  const removeItem = (idx: number) => setEditItems(editItems.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: string, value: string) => {
    setEditItems(editItems.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleActivate = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/todo-presets/${id}/activate`, { method: "PATCH" });
      if (res.ok) await fetchPresets();
    } catch {}
    setSaving(false);
  };

  const handleSave = async () => {
    const validItems = editItems.filter((item) => item.title.trim() && item.categoryId);
    if (validItems.length === 0) return;
    setSaving(true);

    const itemsPayload = validItems.map((item, i) => ({
      title: item.title.trim(),
      description: item.description,
      category: item.categoryId,
      tags: [],
      order: i,
    }));

    if (creating) {
      if (!editName.trim()) { setSaving(false); return; }
      try {
        const res = await fetch("/api/todo-presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim(), scope: creating, weekdays: editWeekdays, items: itemsPayload }),
        });
        if (res.ok) { setCreating(null); await fetchPresets(); }
      } catch {}
    } else if (expandedId) {
      try {
        const res = await fetch(`/api/todo-presets/${expandedId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: editName.trim(), weekdays: editWeekdays, items: itemsPayload }),
        });
        if (res.ok) { setExpandedId(null); await fetchPresets(); }
      } catch {}
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/todo-presets/${id}`, { method: "DELETE" });
      if (res.ok) {
        if (expandedId === id) setExpandedId(null);
        await fetchPresets();
      }
    } catch {}
    setSaving(false);
  };

  if (loading) return <p className="text-muted" style={{ textAlign: "center", fontSize: "0.9rem" }}>Loading...</p>;

  const renderItemEditor = (scope: "everyday" | "custom") => (
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

      {editItems.map((item, idx) => (
        <div key={idx} style={{ display: "flex", gap: "0.3rem", alignItems: "center", marginBottom: "0.3rem" }}>
          <input className="sketchy-input" placeholder="Todo title" value={item.title} onChange={(e) => updateItem(idx, "title", e.target.value)} style={{ flex: 1, padding: "0.2rem 0.4rem", fontSize: "0.85rem", minWidth: 0 }} disabled={saving} />
          <select className="sketchy-input" value={item.categoryId} onChange={(e) => updateItem(idx, "categoryId", e.target.value)} style={{ padding: "0.2rem", fontSize: "0.85rem", maxWidth: 120 }} disabled={saving}>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
          <button type="button" onClick={() => removeItem(idx)} disabled={saving} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: "var(--failed)", padding: "0.1rem", flexShrink: 0 }}>✗</button>
        </div>
      ))}

      <button type="button" onClick={addItem} disabled={saving} style={{ width: "100%", background: "none", border: "1px dashed var(--border-sketch)", borderRadius: "6px", padding: "0.25rem", cursor: "pointer", color: "var(--text-muted)", fontFamily: "var(--font-hand)", fontSize: "0.9rem", marginBottom: "0.4rem" }}>
        + Add Todo Item
      </button>

      <div style={{ display: "flex", gap: "0.3rem", justifyContent: "flex-end" }}>
        <button onClick={() => { setExpandedId(null); setCreating(null); }} className="sketchy-btn sketchy-btn-outline" style={{ padding: "0.2rem 0.5rem", fontSize: "0.85rem" }}>Cancel</button>
        <button onClick={handleSave} className="sketchy-btn" disabled={saving || !editName.trim()} style={{ padding: "0.2rem 0.5rem", fontSize: "0.85rem", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );

  const renderPresetList = (list: TodoPresetData[], scope: "everyday" | "custom") => (
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
              {preset.items.length} todo{preset.items.length !== 1 ? "s" : ""}
              {scope === "custom" && ` · ${DAY_NAMES.filter((_, i) => preset.weekdays.includes(i)).join(", ")}`}
            </span>
            <button onClick={() => handleDelete(preset._id)} disabled={saving} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", color: "var(--failed)", flexShrink: 0 }}>🗑️</button>
          </div>

          {expandedId === preset._id && renderItemEditor(scope)}

          {expandedId !== preset._id && preset.items.length > 0 && (
            <div style={{ paddingLeft: "2rem", paddingTop: "0.2rem" }}>
              {preset.items.map((item) => (
                <div key={item._id} style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontFamily: "var(--font-hand)" }}>
                  · {item.title} <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>({item.category?.name})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {creating === scope && renderItemEditor(scope)}

      {creating !== scope && (
        <button onClick={() => startCreate(scope)} disabled={saving} style={{ width: "100%", background: "none", border: "2px dashed var(--border-sketch)", borderRadius: "8px", padding: "0.4rem", cursor: "pointer", color: "var(--text-muted)", fontFamily: "var(--font-hand)", fontSize: "0.95rem" }}>
          + New {scope === "everyday" ? "Everyday" : "Custom"} Todo Preset
        </button>
      )}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <h3 style={{ fontFamily: "var(--font-hand)", fontSize: "1.2rem", marginBottom: "0.4rem" }}>Everyday Todos</h3>
        <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "0.4rem" }}>Recurring todos for all days. Only one preset active.</p>
        {renderPresetList(everydayPresets, "everyday")}
      </div>

      <div>
        <h3 style={{ fontFamily: "var(--font-hand)", fontSize: "1.2rem", marginBottom: "0.4rem" }}>Custom Todos</h3>
        <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "0.4rem" }}>Recurring todos for specific days. Only one preset active.</p>
        {renderPresetList(customPresets, "custom")}
      </div>
    </div>
  );
}
