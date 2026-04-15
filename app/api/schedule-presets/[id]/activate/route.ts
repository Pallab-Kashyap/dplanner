import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import SchedulePreset from "@/models/SchedulePreset";
import Tag from "@/models/Tag";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

void Tag;

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;
  const { id } = await params;

  try {
    await dbConnect();
    const preset = await SchedulePreset.findOne({ _id: id, userId });
    if (!preset) return errorResponse("Preset not found", 404);

    // Deactivate all of same scope, activate this one
    await SchedulePreset.updateMany({ userId, scope: preset.scope, isActive: true }, { isActive: false });
    preset.isActive = true;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    preset.effectiveFrom = today;

    await preset.save();
    const populated = await SchedulePreset.findById(id).populate("slots.tags").lean();
    return successResponse(populated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to activate preset";
    return errorResponse(message, 500);
  }
}
