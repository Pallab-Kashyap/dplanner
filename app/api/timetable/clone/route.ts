import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import TimetableTemplate from "@/models/TimetableTemplate";
import TimetableOverride from "@/models/TimetableOverride";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

// POST /api/timetable/clone
export async function POST(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const body = await req.json();
    const { fromDayOfWeek, toDayOfWeek, fromDate, toDate } = body;

    // Template-to-template clone
    if (fromDayOfWeek !== undefined && toDayOfWeek !== undefined) {
      const source = await TimetableTemplate.findOne({ userId, dayOfWeek: fromDayOfWeek });
      if (!source) return errorResponse(`No template found for dayOfWeek ${fromDayOfWeek}`, 404);

      const slotsClone = source.slots.map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
        title: s.title,
        description: s.description,
        tags: s.tags,
        status: "pending" as const,
        statusNote: "",
      }));

      const result = await TimetableTemplate.findOneAndUpdate(
        { userId, dayOfWeek: toDayOfWeek },
        { userId, dayOfWeek: toDayOfWeek, slots: slotsClone },
        { returnDocument: "after", upsert: true, runValidators: true }
      ).populate("slots.tags");

      return successResponse({ source: "template", clonedTo: result });
    }

    // Date-to-date clone
    if (fromDate && toDate) {
      const fromDateObj = new Date(fromDate + "T00:00:00.000Z");
      const nextDay = new Date(fromDateObj);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);

      let sourceSlots;
      const override = await TimetableOverride.findOne({
        userId,
        date: { $gte: fromDateObj, $lt: nextDay },
      });
      if (override) {
        sourceSlots = override.slots;
      } else {
        const template = await TimetableTemplate.findOne({
          userId,
          dayOfWeek: fromDateObj.getUTCDay(),
        });
        if (template) sourceSlots = template.slots;
      }

      if (!sourceSlots || sourceSlots.length === 0) {
        return errorResponse(`No timetable found for ${fromDate}`, 404);
      }

      const slotsClone = sourceSlots.map((s) => ({
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
    }

    return errorResponse("Provide either { fromDayOfWeek, toDayOfWeek } or { fromDate, toDate }");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to clone timetable";
    return errorResponse(message, 500);
  }
}
