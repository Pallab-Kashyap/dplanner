"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("dplaner-theme");
    if (saved === "dark") {
      setIsDark(true);
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("dplaner-theme", next ? "dark" : "light");
  };

  return (
    <button className="theme-toggle" onClick={toggle} title="Toggle theme">
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
