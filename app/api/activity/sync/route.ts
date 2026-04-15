import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Todo from "@/models/Todo";
import TimetableOverride from "@/models/TimetableOverride";
import SchedulePreset from "@/models/SchedulePreset";
import UserSettings from "@/models/UserSettings";
import DailyLog from "@/models/DailyLog";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

// POST /api/activity/sync
export async function POST(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const body = await req.json();
    const { date: dateStr } = body;
    if (!dateStr) return errorResponse("date is required (YYYY-MM-DD)");

    const date = new Date(dateStr + "T00:00:00.000Z");
    const nextDay = new Date(date);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const todos = await Todo.find({ userId, date: { $gte: date, $lt: nextDay } });

    let timetableSlots: { status: string }[] = [];
    const override = await TimetableOverride.findOne({ userId, date: { $gte: date, $lt: nextDay } });
    if (override) {
      timetableSlots = override.slots;
    } else {
      // Resolve from active schedule presets with priority
      const [presets, settings] = await Promise.all([
        SchedulePreset.find({ userId, isActive: true }).lean(),
        UserSettings.findOne({ userId }).lean(),
      ]);
      const priority = settings?.schedulePriority || "custom";
      const dayOfWeek = date.getUTCDay();
      const customPreset = presets.find((p) => p.scope === "custom" && p.weekdays.includes(dayOfWeek) && date >= new Date(p.effectiveFrom));
      const everydayPreset = presets.find((p) => p.scope === "everyday" && date >= new Date(p.effectiveFrom));
      const chosen = customPreset && everydayPreset ? (priority === "custom" ? customPreset : everydayPreset) : (customPreset || everydayPreset);
      if (chosen) timetableSlots = chosen.slots;
    }

    const allStatuses = [
      ...todos.map((t) => t.status),
      ...timetableSlots.map((s) => s.status),
    ];

    const totalTasks = allStatuses.length;
    const completedTasks = allStatuses.filter((s) => s === "completed").length;
    const partialTasks = allStatuses.filter((s) => s === "partial").length;
    const failedTasks = allStatuses.filter((s) => s === "failed").length;
    const completionRate =
      totalTasks > 0
        ? Math.round(((completedTasks + partialTasks * 0.5) / totalTasks) * 100)
        : 0;

    const dailyLog = await DailyLog.findOneAndUpdate(
      { userId, date: { $gte: date, $lt: nextDay } },
      { userId, date, totalTasks, completedTasks, partialTasks, failedTasks, completionRate },
      { returnDocument: "after", upsert: true }
    );

    return successResponse(dailyLog);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to sync activity";
    return errorResponse(message, 500);
  }
}
