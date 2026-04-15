import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import SchedulePreset from "@/models/SchedulePreset";
import TimetableOverride from "@/models/TimetableOverride";
import UserSettings from "@/models/UserSettings";
import Tag from "@/models/Tag";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

void Tag;

// POST /api/timetable/clone - clone schedule from one date to another
export async function POST(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const body = await req.json();
    const { fromDate, toDate } = body;

    if (!fromDate || !toDate) {
      return errorResponse("Provide { fromDate, toDate } in YYYY-MM-DD format");
    }

    const fromDateObj = new Date(fromDate + "T00:00:00.000Z");
    const nextDay = new Date(fromDateObj);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    const dayOfWeek = fromDateObj.getUTCDay();

    // Resolve source slots
    let sourceSlots;
    const override = await TimetableOverride.findOne({
      userId,
      date: { $gte: fromDateObj, $lt: nextDay },
    });

    if (override) {
      sourceSlots = override.slots;
    } else {
      // Check active presets
      const [presets, settings] = await Promise.all([
        SchedulePreset.find({ userId, isActive: true }).lean(),
        UserSettings.findOne({ userId }).lean(),
      ]);
      const priority = settings?.schedulePriority || "custom";
      const customPreset = presets.find((p) => p.scope === "custom" && p.weekdays.includes(dayOfWeek));
      const everydayPreset = presets.find((p) => p.scope === "everyday");
      const customApplies = customPreset && fromDateObj >= new Date(customPreset.effectiveFrom);
      const everydayApplies = everydayPreset && fromDateObj >= new Date(everydayPreset.effectiveFrom);

      if (customApplies && everydayApplies) {
        sourceSlots = (priority === "custom" ? customPreset : everydayPreset)!.slots;
      } else if (customApplies) {
        sourceSlots = customPreset!.slots;
      } else if (everydayApplies) {
        sourceSlots = everydayPreset!.slots;
      }
    }

    if (!sourceSlots || sourceSlots.length === 0) {
      return errorResponse(`No timetable found for ${fromDate}`, 404);
    }

    const slotsClone = sourceSlots.map((s: { startTime: string; endTime: string; title: string; description: string; tags: unknown[] }) => ({
      startTime: s.startTime,
      endTime: s.endTime,
      title: s.title,
      description: s.description,
      tags: s.tags,
      status: "pending" as const,
      statusNote: "",
    }));

    const toDateObj = new Date(toDate + "T00:00:00.000Z");
    const result = await TimetableOverride.findOneAndUpdate(
      { userId, date: { $gte: toDateObj, $lt: new Date(toDateObj.getTime() + 86400000) } },
      { userId, date: toDateObj, slots: slotsClone },
      { returnDocument: "after", upsert: true, runValidators: true }
    ).populate("slots.tags");

    return successResponse({ source: "date", clonedTo: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to clone timetable";
    return errorResponse(message, 500);
  }
}
