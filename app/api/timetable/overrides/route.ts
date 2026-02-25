import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import TimetableOverride from "@/models/TimetableOverride";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

// GET /api/timetable/overrides?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    if (dateStr) {
      const date = new Date(dateStr + "T00:00:00.000Z");
      const nextDay = new Date(date);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const override = await TimetableOverride.findOne({
        userId,
        date: { $gte: date, $lt: nextDay },
      }).populate("slots.tags");
      return successResponse(override);
    }

    const overrides = await TimetableOverride.find({ userId })
      .sort({ date: -1 })
      .limit(30)
      .populate("slots.tags");
    return successResponse(overrides);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch overrides";
    return errorResponse(message, 500);
  }
}

// POST /api/timetable/overrides
export async function POST(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const body = await req.json();
    const { date, slots } = body;
    if (!date) return errorResponse("date is required (YYYY-MM-DD)");
    if (!Array.isArray(slots)) return errorResponse("slots must be an array");

    const dateObj = new Date(date + "T00:00:00.000Z");

    const override = await TimetableOverride.findOneAndUpdate(
      { userId, date: { $gte: dateObj, $lt: new Date(dateObj.getTime() + 86400000) } },
      { userId, date: dateObj, slots },
      { returnDocument: "after", upsert: true, runValidators: true }
    ).populate("slots.tags");

    return successResponse(override, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create override";
    return errorResponse(message, 500);
  }
}
