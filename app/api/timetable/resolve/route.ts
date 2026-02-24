import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import TimetableTemplate from "@/models/TimetableTemplate";
import TimetableOverride from "@/models/TimetableOverride";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

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

    const template = await TimetableTemplate.findOne({ userId, dayOfWeek }).populate("slots.tags");

    if (template) {
      return successResponse({
        source: "template",
        date: dateStr,
        dayOfWeek,
        slots: template.slots,
        templateId: template._id,
      });
    }

    return successResponse({ source: "none", date: dateStr, dayOfWeek, slots: [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to resolve timetable";
    return errorResponse(message, 500);
  }
}
