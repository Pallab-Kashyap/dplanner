import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import TimetableOverride from "@/models/TimetableOverride";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

type Params = { params: Promise<{ id: string }> };

// PUT /api/timetable/overrides/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    const override = await TimetableOverride.findOneAndUpdate({ _id: id, userId }, body, {
      new: true,
      runValidators: true,
    }).populate("slots.tags");
    if (!override) return errorResponse("Override not found", 404);
    return successResponse(override);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update override";
    return errorResponse(message, 500);
  }
}

// DELETE /api/timetable/overrides/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { id } = await params;
    const override = await TimetableOverride.findOneAndDelete({ _id: id, userId });
    if (!override) return errorResponse("Override not found", 404);
    return successResponse({ deleted: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete override";
    return errorResponse(message, 500);
  }
}
