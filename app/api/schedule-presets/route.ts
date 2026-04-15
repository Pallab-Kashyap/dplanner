import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import SchedulePreset from "@/models/SchedulePreset";
import Tag from "@/models/Tag";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

void Tag; // ensure Tag model registered for populate

export async function GET() {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const presets = await SchedulePreset.find({ userId })
      .sort({ scope: 1, updatedAt: -1 })
      .populate("slots.tags")
      .lean();
    return successResponse(presets);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch schedule presets";
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const body = await req.json();
    const { name, scope, weekdays, slots } = body;

    if (!name?.trim()) return errorResponse("name is required");
    if (!["everyday", "custom"].includes(scope)) return errorResponse("scope must be 'everyday' or 'custom'");
    if (!Array.isArray(slots)) return errorResponse("slots must be an array");

    const safeWeekdays = scope === "everyday" ? [0, 1, 2, 3, 4, 5, 6] : weekdays;
    if (scope === "custom" && (!Array.isArray(safeWeekdays) || safeWeekdays.length === 0)) {
      return errorResponse("weekdays required for custom scope");
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Deactivate other presets of same scope
    await SchedulePreset.updateMany({ userId, scope, isActive: true }, { isActive: false });

    const preset = await SchedulePreset.create({
      userId, name: name.trim(), scope, weekdays: safeWeekdays, slots,
      isActive: true, effectiveFrom: today,
    });

    const populated = await SchedulePreset.findById(preset._id).populate("slots.tags").lean();
    return successResponse(populated, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create schedule preset";
    return errorResponse(message, 500);
  }
}
