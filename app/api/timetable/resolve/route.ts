import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import SchedulePreset from "@/models/SchedulePreset";
import TimetableOverride from "@/models/TimetableOverride";
import UserSettings from "@/models/UserSettings";
import Tag from "@/models/Tag";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

void Tag;

// GET /api/timetable/resolve?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    if (!dateStr) return errorResponse("date query parameter is required (YYYY-MM-DD)");

    const date = new Date(dateStr + "T00:00:00.000Z");
    const nextDay = new Date(date);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const dayOfWeek = date.getUTCDay();

    const override = await TimetableOverride.findOne({
      userId,
      date: { $gte: date, $lt: nextDay },
    }).populate("slots.tags");

    if (override) {
      return successResponse({
        source: "override",
        date: dateStr,
        dayOfWeek,
        slots: override.slots,
        overrideId: override._id,
      });
    }

    const [presets, settings] = await Promise.all([
      SchedulePreset.find({ userId, isActive: true }).populate("slots.tags").lean(),
      UserSettings.findOne({ userId }).lean(),
    ]);

    const priority = settings?.schedulePriority || "custom";
    const customPreset = presets.find((p) => p.scope === "custom" && p.weekdays.includes(dayOfWeek));
    const everydayPreset = presets.find((p) => p.scope === "everyday");

    const customApplies = customPreset && date >= new Date(customPreset.effectiveFrom);
    const everydayApplies = everydayPreset && date >= new Date(everydayPreset.effectiveFrom);

    let resolvedPreset = null;
    if (customApplies && everydayApplies) {
      resolvedPreset = priority === "custom" ? customPreset : everydayPreset;
    } else if (customApplies) {
      resolvedPreset = customPreset;
    } else if (everydayApplies) {
      resolvedPreset = everydayPreset;
    }

    if (resolvedPreset) {
      return successResponse({
        source: "preset",
        date: dateStr,
        dayOfWeek,
        slots: resolvedPreset.slots,
        presetId: resolvedPreset._id,
      });
    }

    return successResponse({ source: "none", date: dateStr, dayOfWeek, slots: [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to resolve timetable";
    return errorResponse(message, 500);
  }
}
