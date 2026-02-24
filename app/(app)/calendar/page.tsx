"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface CalendarDay {
  date: string;
  dayOfWeek: number;
  completed: number;
  total: number;
  completionRate: number;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getYellowShade(completionRate: number, isDark: boolean): string {
  if (completionRate === 0) return "var(--bg-card)";
  const intensity = Math.min(completionRate / 100, 1);
  if (isDark) {
    // Dark mode: subtle warm amber tones
    const r = Math.round(35 + intensity * 55);
    const g = Math.round(35 + intensity * 45);
    const b = Math.round(48 - intensity * 20);
    return `rgb(${r}, ${g}, ${b})`;
  }
  // Light mode: warm creamy yellow → golden
  const r = 255;
  const g = Math.round(248 - intensity * 45);
  const b = Math.round(240 - intensity * 175);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function CalendarPage() {
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // Reactively track theme
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?month=${month}&year=${year}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setDays(data.data.days);
      }
    } catch {}
    setLoading(false);
  }, [month, year]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); };

  const firstDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const leadingEmpties = firstDay === 0 ? 6 : firstDay - 1;



  const handleDayClick = (dateStr: string) => {
    router.push(`/today?date=${dateStr}`);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <button className="sketchy-btn sketchy-btn-outline" onClick={prevMonth} style={{ padding: "0.3rem 0.8rem" }}>←</button>
        <h1 style={{ fontSize: "2.5rem", margin: 0 }}>{MONTH_NAMES[month - 1]} {year}</h1>
        <button className="sketchy-btn sketchy-btn-outline" onClick={nextMonth} style={{ padding: "0.3rem 0.8rem" }}>→</button>
      </div>

      {loading ? (
        <div className="flex-center" style={{ minHeight: "40vh" }}><div className="loading-spinner" /></div>
      ) : (
        <div className="calendar-grid">
          {DAY_HEADERS.map((d) => <div key={d} className="calendar-day-header">{d}</div>)}
          {Array.from({ length: leadingEmpties }).map((_, i) => <div key={`empty-${i}`} className="calendar-day empty" />)}

          {days.map((day) => {
            const dateNum = new Date(day.date + "T00:00:00.000Z").getUTCDate();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            const isCurrentDay = day.date === todayStr;

            return (
              <div
                key={day.date}
                className="calendar-day"
                onClick={() => handleDayClick(day.date)}
                style={{
                  backgroundColor: getYellowShade(day.completionRate, isDark),
                  border: isCurrentDay ? "3px solid var(--accent)" : undefined,
                }}
              >
                {day.total > 0 && <span className="day-stats">{day.completed}/{day.total}</span>}
                <span className="day-number">{dateNum}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem", fontFamily: "var(--font-body)" }}>
        <span className="text-muted">Less</span>
        {[0, 25, 50, 75, 100].map((rate) => (
          <div key={rate} style={{ width: 24, height: 24, backgroundColor: getYellowShade(rate, isDark), border: "2px solid var(--border-sketch)", borderRadius: "4px" }} />
        ))}
        <span className="text-muted">More</span>
      </div>
    </div>
  );
}
