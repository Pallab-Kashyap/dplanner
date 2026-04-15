import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import DailyLog from "@/models/DailyLog";
import Todo from "@/models/Todo";
import TimetableOverride from "@/models/TimetableOverride";
import SchedulePreset from "@/models/SchedulePreset";
import UserSettings from "@/models/UserSettings";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

// GET /api/calendar?month=2&year=2026
export async function GET(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const userId = new mongoose.Types.ObjectId(authResult.userId);

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    if (isNaN(month) || month < 1 || month > 12) return errorResponse("Invalid month (1-12)", 400);
    if (isNaN(year) || year < 2000 || year > 2100) return errorResponse("Invalid year", 400);

    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    // Batch: fetch ALL data for the month in 5 parallel queries
    const [logs, todos, overrides, schedulePresets, userSettings] = await Promise.all([
      DailyLog.find({ userId, date: { $gte: startDate, $lt: endDate } }).lean(),
      Todo.find({ userId, date: { $gte: startDate, $lt: endDate } }).lean(),
      TimetableOverride.find({ userId, date: { $gte: startDate, $lt: endDate } }).lean(),
      SchedulePreset.find({ userId, isActive: true }).lean(),
      UserSettings.findOne({ userId }).lean(),
    ]);

    const schedulePriority = userSettings?.schedulePriority || "custom";
    const activeCustomSchedule = schedulePresets.find((p: any) => p.scope === "custom");
    const activeEverydaySchedule = schedulePresets.find((p: any) => p.scope === "everyday");

    // Build lookup maps
    const logMap = new Map(logs.map((l: any) => [l.date.toISOString().split("T")[0], l]));

    // Group todos and overrides by date string
    const todosByDate = new Map<string, any[]>();
    for (const t of todos) {
      const ds = (t as any).date.toISOString().split("T")[0];
      if (!todosByDate.has(ds)) todosByDate.set(ds, []);
      todosByDate.get(ds)!.push(t);
    }
    const overrideByDate = new Map<string, any>();
    for (const o of overrides) {
      const ds = (o as any).date.toISOString().split("T")[0];
      overrideByDate.set(ds, o);
    }

    // Build calendar
    const daysInMonth = new Date(year, month, 0).getDate();
    const calendarDays = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      const dateStr = dateObj.toISOString().split("T")[0];
      const log = logMap.get(dateStr);

      if (log) {
        calendarDays.push({
          date: dateStr,
          dayOfWeek: dateObj.getUTCDay(),
          completed: (log as any).completedTasks,
          total: (log as any).totalTasks,
          completionRate: (log as any).completionRate,
        });
      } else {
        // Compute from in-memory data
        const dayTodos = todosByDate.get(dateStr) || [];
        const override = overrideByDate.get(dateStr);
        let slotStatuses: string[] = [];
        if (override) {
          slotStatuses = (override.slots || []).map((s: any) => s.status);
        } else {
          // Resolve from active schedule presets with priority
          const dayOfWeek = dateObj.getUTCDay();
          const customApplies = activeCustomSchedule && activeCustomSchedule.weekdays.includes(dayOfWeek) && dateObj >= new Date(activeCustomSchedule.effectiveFrom);
          const everydayApplies = activeEverydaySchedule && dateObj >= new Date(activeEverydaySchedule.effectiveFrom);
          let chosen: any = null;
          if (customApplies && everydayApplies) chosen = schedulePriority === "custom" ? activeCustomSchedule : activeEverydaySchedule;
          else if (customApplies) chosen = activeCustomSchedule;
          else if (everydayApplies) chosen = activeEverydaySchedule;
          if (chosen) slotStatuses = (chosen.slots || []).map((s: any) => s.status);
        }

        const allStatuses = [...dayTodos.map((t: any) => t.status), ...slotStatuses];
        const total = allStatuses.length;
        const completed = allStatuses.filter((s) => s === "completed").length;
        const partial = allStatuses.filter((s) => s === "partial").length;
        const completionRate = total > 0 ? Math.round(((completed + partial * 0.5) / total) * 100) : 0;

        calendarDays.push({
          date: dateStr,
          dayOfWeek: dateObj.getUTCDay(),
          completed,
          total,
          completionRate,
        });
      }
    }

    return successResponse({ month, year, days: calendarDays });
  } catch (error: unknown) {
    console.error("Calendar API error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch calendar";
    return errorResponse(message, 500);
  }
}
