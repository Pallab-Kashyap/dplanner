import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import TimetableTemplate from "@/models/TimetableTemplate";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

type Params = { params: Promise<{ id: string }> };

// PUT /api/timetable/templates/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    const template = await TimetableTemplate.findOneAndUpdate({ _id: id, userId }, body, {
      returnDocument: "after",
      runValidators: true,
    }).populate("slots.tags");
    if (!template) return errorResponse("Template not found", 404);
    return successResponse(template);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update template";
    return errorResponse(message, 500);
  }
}

// DELETE /api/timetable/templates/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { id } = await params;
    const template = await TimetableTemplate.findOneAndDelete({ _id: id, userId });
    if (!template) return errorResponse("Template not found", 404);
    return successResponse({ deleted: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete template";
    return errorResponse(message, 500);
  }
}
