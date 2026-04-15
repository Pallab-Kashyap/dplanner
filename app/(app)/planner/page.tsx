"use client";

import { useState } from "react";
import ScheduleManager from "@/components/ScheduleManager";
import TodoPresetManager from "@/components/TodoPresetManager";
import TagManager from "@/components/TagManager";
import SettingsPanel from "@/components/SettingsPanel";

type Tab = "schedules" | "todos" | "tags" | "settings";

const TAB_LABELS: Record<Tab, string> = {
  schedules: "📅 Schedules",
  todos: "📋 Todos",
  tags: "🏷️ Tags",
  settings: "⚙️ Settings",
};

export default function PlannerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("schedules");

  return (
    <div className="planner-page">
      <h1 style={{ fontFamily: "var(--font-hand)", fontSize: "2rem", marginBottom: "1rem" }}>
        ⚙️ Settings
      </h1>

      <div className="planner-tabs">
        {(["schedules", "todos", "tags", "settings"] as Tab[]).map((tab) => (
          <button
            key={tab}
            className={`planner-tab ${activeTab === tab ? "planner-tab-active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div className="planner-tab-content">
        {activeTab === "schedules" && <ScheduleManager />}
        {activeTab === "todos" && <TodoPresetManager />}
        {activeTab === "tags" && <TagManager onClose={() => {}} inline />}
        {activeTab === "settings" && <SettingsPanel />}
      </div>
    </div>
  );
}
