import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Todo from "@/models/Todo";
import TodoCategory from "@/models/TodoCategory";
import TimetableTemplate from "@/models/TimetableTemplate";
import TimetableOverride from "@/models/TimetableOverride";
import DailyLog from "@/models/DailyLog";
import Tag from "@/models/Tag";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

// Ensure Tag model is registered for populate
void Tag;

// GET /api/days?before=YYYY-MM-DD&limit=7
export async function GET(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const userId = new mongoose.Types.ObjectId(authResult.userId);

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const beforeStr = searchParams.get("before") || new Date().toISOString().split("T")[0];
    const limit = Math.min(parseInt(searchParams.get("limit") || "7"), 30);

    const beforeDate = new Date(beforeStr + "T00:00:00.000Z");

    // Compute date range for the batch
    const endDate = new Date(beforeDate);
    endDate.setUTCDate(endDate.getUTCDate() + 1); // inclusive of beforeDate
    const startDate = new Date(beforeDate);
    startDate.setUTCDate(startDate.getUTCDate() - limit + 1);

    // Batch: 5 parallel queries for entire range
    const [allCategories, templates, overrides, todos, dailyLogs] = await Promise.all([
      TodoCategory.find({ userId }).sort({ order: 1 }),
      TimetableTemplate.find({ userId }).populate("slots.tags"),
      TimetableOverride.find({ userId, date: { $gte: startDate, $lt: endDate } }).populate("slots.tags"),
      Todo.find({ userId, date: { $gte: startDate, $lt: endDate } }).populate("category").populate("tags").sort({ order: 1 }),
      DailyLog.find({ userId, date: { $gte: startDate, $lt: endDate } }),
    ]);

    // Seed defaults if needed
    let categories = allCategories;
    if (categories.length === 0) {
      const defaults = [
        { userId, name: "Todo", color: "#6366f1", order: 0, isDefault: true, scope: "permanent" },
        { userId, name: "Working", color: "#f59e0b", order: 1, isDefault: true, scope: "permanent" },
        { userId, name: "Completed", color: "#22c55e", order: 2, isDefault: true, scope: "permanent" },
      ];
      categories = await TodoCategory.create(defaults);
    }

    // Build lookup maps
    const templateMap = new Map(templates.map((t) => [t.dayOfWeek, t]));

    const overrideByDate = new Map<string, typeof overrides[0]>();
    for (const o of overrides) {
      overrideByDate.set(o.date.toISOString().split("T")[0], o);
    }

    const todosByDate = new Map<string, typeof todos>();
    for (const t of todos) {
      const ds = t.date.toISOString().split("T")[0];
      if (!todosByDate.has(ds)) todosByDate.set(ds, []);
      todosByDate.get(ds)!.push(t);
    }

    const logByDate = new Map<string, typeof dailyLogs[0]>();
    for (const l of dailyLogs) {
      logByDate.set(l.date.toISOString().split("T")[0], l);
    }

    // Build days from in-memory data
    const days = [];

    for (let i = 0; i < limit; i++) {
      const dayDate = new Date(beforeDate);
      dayDate.setUTCDate(dayDate.getUTCDate() - i);
      const dateStr = dayDate.toISOString().split("T")[0];
      const dayOfWeek = dayDate.getUTCDay();

      const override = overrideByDate.get(dateStr);
      const slots = override ? override.slots : (templateMap.get(dayOfWeek)?.slots || []);
      const dayTodos = todosByDate.get(dateStr) || [];
      const dailyLog = logByDate.get(dateStr) || null;

      // Filter categories visible for this day
      const dayCategories = categories.filter((cat) => {
        if (cat.scope === "permanent" || cat.scope === "everyday") return true;
        if (cat.scope === "weekly") return cat.weekdays.includes(dayOfWeek);
        if (cat.scope === "date" && cat.specificDate) {
          const catDateStr = cat.specificDate.toISOString().split("T")[0];
          return catDateStr === dateStr;
        }
        return true; // fallback for old data without scope
      });

      days.push({
        date: dateStr,
        dayOfWeek,
        source: override ? "override" : (templateMap.has(dayOfWeek) ? "template" : "none"),
        slots,
        todos: dayTodos,
        dailyLog,
        categories: dayCategories,
      });
    }

    return successResponse({ days, allCategories: categories });
  } catch (error: unknown) {
    console.error("API /api/days error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch days";
    return errorResponse(message, 500);
  }
}
