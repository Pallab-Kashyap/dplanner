import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import TimetableTemplate from "@/models/TimetableTemplate";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

// GET /api/timetable/templates?dayOfWeek=0
export async function GET(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const dayOfWeekStr = searchParams.get("dayOfWeek");

    if (dayOfWeekStr !== null) {
      const dayOfWeek = parseInt(dayOfWeekStr);
      if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return errorResponse("dayOfWeek must be 0-6 (Sun=0, Sat=6)");
      }
      const template = await TimetableTemplate.findOne({ userId, dayOfWeek }).populate("slots.tags");
      return successResponse(template);
    }

    const templates = await TimetableTemplate.find({ userId }).sort({ dayOfWeek: 1 }).populate("slots.tags");
    return successResponse(templates);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch templates";
    return errorResponse(message, 500);
  }
}

// POST /api/timetable/templates
export async function POST(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const body = await req.json();
    const { dayOfWeek, slots } = body;

    if (dayOfWeek === undefined || dayOfWeek === null) return errorResponse("dayOfWeek is required (0-6)");
    if (!Array.isArray(slots)) return errorResponse("slots must be an array");

    const template = await TimetableTemplate.findOneAndUpdate(
      { userId, dayOfWeek },
      { userId, dayOfWeek, slots },
      { new: true, upsert: true, runValidators: true }
    ).populate("slots.tags");

    return successResponse(template, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create template";
    return errorResponse(message, 500);
  }
}
