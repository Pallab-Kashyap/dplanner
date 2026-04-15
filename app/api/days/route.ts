import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Todo from "@/models/Todo";
import TodoCategory from "@/models/TodoCategory";
import SchedulePreset from "@/models/SchedulePreset";
import TimetableOverride from "@/models/TimetableOverride";
import TodoPreset from "@/models/TodoPreset";
import UserSettings from "@/models/UserSettings";
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

    // Batch: 7 parallel queries for entire range
    const [allCategories, schedulePresets, overrides, todos, dailyLogs, todoPresets, userSettings] = await Promise.all([
      TodoCategory.find({ userId }).sort({ order: 1 }).lean(),
      SchedulePreset.find({ userId, isActive: true }).populate("slots.tags").lean(),
      TimetableOverride.find({ userId, date: { $gte: startDate, $lt: endDate } }).populate("slots.tags"),
      Todo.find({ userId, date: { $gte: startDate, $lt: endDate } }).populate("category").populate("tags").sort({ order: 1 }),
      DailyLog.find({ userId, date: { $gte: startDate, $lt: endDate } }).lean(),
      TodoPreset.find({ userId, isActive: true }).populate("items.category").populate("items.tags").lean(),
      UserSettings.findOne({ userId }).lean(),
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

    // Resolve active schedule presets
    const schedulePriority = userSettings?.schedulePriority || "custom";
    const todoPriority = userSettings?.todoPriority || "custom";

    const activeEverydaySchedule = schedulePresets.find((p) => p.scope === "everyday");
    const activeCustomSchedule = schedulePresets.find((p) => p.scope === "custom");
    const activeEverydayTodo = todoPresets.find((p) => p.scope === "everyday");
    const activeCustomTodo = todoPresets.find((p) => p.scope === "custom");

    // Build lookup maps
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

      // === Schedule resolution ===
      const override = overrideByDate.get(dateStr);
      let slots: unknown[] = [];
      let source = "none";

      if (override) {
        slots = override.slots;
        source = "override";
      } else {
        const customApplies = activeCustomSchedule
          && activeCustomSchedule.weekdays.includes(dayOfWeek)
          && dayDate >= new Date(activeCustomSchedule.effectiveFrom);
        const everydayApplies = activeEverydaySchedule
          && dayDate >= new Date(activeEverydaySchedule.effectiveFrom);

        if (customApplies && everydayApplies) {
          if (schedulePriority === "custom") {
            slots = activeCustomSchedule.slots;
            source = "preset-custom";
          } else {
            slots = activeEverydaySchedule.slots;
            source = "preset-everyday";
          }
        } else if (customApplies) {
          slots = activeCustomSchedule!.slots;
          source = "preset-custom";
        } else if (everydayApplies) {
          slots = activeEverydaySchedule!.slots;
          source = "preset-everyday";
        }
      }

      // === Virtual todo resolution ===
      const realTodos = todosByDate.get(dateStr) || [];
      const realTemplateIds = new Set(
        realTodos.filter((t) => t.templateId).map((t) => t.templateId!.toString())
      );

      const virtualTodos: unknown[] = [];

      const processPreset = (preset: typeof activeEverydayTodo) => {
        if (!preset) return;
        if (dayDate < new Date(preset.effectiveFrom)) return;
        if (!preset.weekdays.includes(dayOfWeek)) return;

        for (const item of preset.items) {
          const compositeId = `${preset._id}_${item._id}`;
          if (realTemplateIds.has(compositeId)) continue;

          virtualTodos.push({
            _id: `tmpl_${preset._id}_${item._id}_${dateStr}`,
            title: item.title,
            description: item.description,
            category: item.category,
            status: "pending",
            statusNote: "",
            tags: item.tags || [],
            templateId: compositeId,
            date: dateStr,
            order: item.order,
            _template: true,
          });
        }
      };

      const customTodoApplies = activeCustomTodo
        && activeCustomTodo.weekdays.includes(dayOfWeek)
        && dayDate >= new Date(activeCustomTodo.effectiveFrom);
      const everydayTodoApplies = activeEverydayTodo
        && dayDate >= new Date(activeEverydayTodo.effectiveFrom);

      if (customTodoApplies && everydayTodoApplies) {
        if (todoPriority === "custom") {
          processPreset(activeCustomTodo);
        } else {
          processPreset(activeEverydayTodo);
        }
      } else {
        if (customTodoApplies) processPreset(activeCustomTodo);
        if (everydayTodoApplies) processPreset(activeEverydayTodo);
      }

      const dayTodos = [...realTodos, ...virtualTodos];
      const dailyLog = logByDate.get(dateStr) || null;

      // Filter categories visible for this day
      const dayCategories = categories.filter((cat) => {
        if (cat.scope === "permanent") return true;
        if (cat.scope === "everyday") {
          const catEffective = new Date(cat.effectiveFrom || cat.createdAt || 0);
          return dayDate >= catEffective;
        }
        if (cat.scope === "weekly") {
          const catEffective = new Date(cat.effectiveFrom || cat.createdAt || 0);
          return cat.weekdays.includes(dayOfWeek) && dayDate >= catEffective;
        }
        if (cat.scope === "date" && cat.specificDate) {
          const catDateStr = cat.specificDate.toISOString().split("T")[0];
          return catDateStr === dateStr;
        }
        return true; // fallback for old data without scope
      });

      days.push({
        date: dateStr,
        dayOfWeek,
        source,
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
