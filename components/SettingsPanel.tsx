"use client";

import { useState, useEffect } from "react";

interface Settings {
  theme: "light" | "dark";
  schedulePriority: "custom" | "everyday";
  todoPriority: "custom" | "everyday";
}

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Settings>({
    theme: "light",
    schedulePriority: "custom",
    todoPriority: "custom",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setSettings({
              theme: data.data.theme || "light",
              schedulePriority: data.data.schedulePriority || "custom",
              todoPriority: data.data.todoPriority || "custom",
            });
          }
        }
      } catch {}
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const updateSetting = async (key: keyof Settings, value: string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaving(true);

    // Sync theme with DOM
    if (key === "theme") {
      document.documentElement.setAttribute("data-theme", value);
      localStorage.setItem("dplaner-theme", value);
    }

    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
    } catch {}
    setSaving(false);
  };

  if (loading) return <p className="text-muted" style={{ textAlign: "center", fontSize: "0.9rem" }}>Loading...</p>;

  const radioStyle = (active: boolean) => ({
    display: "flex" as const,
    alignItems: "center" as const,
    gap: "0.3rem",
    padding: "0.4rem 0.8rem",
    borderRadius: "8px",
    border: `2px solid ${active ? "var(--border-sketch)" : "transparent"}`,
    background: active ? "var(--accent)" : "var(--bg)",
    color: active ? "#3D3229" : "var(--text)",
    cursor: "pointer",
    fontFamily: "var(--font-hand)",
    fontSize: "1rem",
    fontWeight: 600,
    transition: "all 0.15s ease",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
      {/* Theme */}
      <div>
        <h3 style={{ fontFamily: "var(--font-hand)", fontSize: "1.2rem", marginBottom: "0.4rem" }}>Theme</h3>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button onClick={() => updateSetting("theme", "light")} style={radioStyle(settings.theme === "light")} disabled={saving}>
            ☀️ Light
          </button>
          <button onClick={() => updateSetting("theme", "dark")} style={radioStyle(settings.theme === "dark")} disabled={saving}>
            🌙 Dark
          </button>
        </div>
      </div>

      {/* Schedule Priority */}
      <div>
        <h3 style={{ fontFamily: "var(--font-hand)", fontSize: "1.2rem", marginBottom: "0.2rem" }}>Schedule Priority</h3>
        <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "0.4rem" }}>
          When both everyday and custom schedules cover the same day, which one should be used?
        </p>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button onClick={() => updateSetting("schedulePriority", "custom")} style={radioStyle(settings.schedulePriority === "custom")} disabled={saving}>
            Custom first
          </button>
          <button onClick={() => updateSetting("schedulePriority", "everyday")} style={radioStyle(settings.schedulePriority === "everyday")} disabled={saving}>
            Everyday first
          </button>
        </div>
      </div>

      {/* Todo Priority */}
      <div>
        <h3 style={{ fontFamily: "var(--font-hand)", fontSize: "1.2rem", marginBottom: "0.2rem" }}>Todo Priority</h3>
        <p className="text-muted" style={{ fontSize: "0.8rem", marginBottom: "0.4rem" }}>
          When both everyday and custom todo presets cover the same day, which one should be used?
        </p>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button onClick={() => updateSetting("todoPriority", "custom")} style={radioStyle(settings.todoPriority === "custom")} disabled={saving}>
            Custom first
          </button>
          <button onClick={() => updateSetting("todoPriority", "everyday")} style={radioStyle(settings.todoPriority === "everyday")} disabled={saving}>
            Everyday first
          </button>
        </div>
      </div>

      {saving && <p className="text-muted" style={{ fontSize: "0.8rem" }}>Saving...</p>}
    </div>
  );
}
