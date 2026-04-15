import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import TodoPreset from "@/models/TodoPreset";
import Tag from "@/models/Tag";
import TodoCategory from "@/models/TodoCategory";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

void Tag;
void TodoCategory;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;
  const { id } = await params;

  try {
    await dbConnect();
    const body = await req.json();
    const { name, scope, weekdays, items } = body;

    const preset = await TodoPreset.findOne({ _id: id, userId });
    if (!preset) return errorResponse("Preset not found", 404);

    if (name !== undefined) preset.name = name.trim();
    if (items !== undefined) preset.items = items;
    if (scope !== undefined) {
      preset.scope = scope;
      preset.weekdays = scope === "everyday" ? [0, 1, 2, 3, 4, 5, 6] : (weekdays || preset.weekdays);
    } else if (weekdays !== undefined) {
      preset.weekdays = weekdays;
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    preset.effectiveFrom = today;

    // Auto-activate on edit
    await TodoPreset.updateMany({ userId, scope: preset.scope, isActive: true, _id: { $ne: id } }, { isActive: false });
    preset.isActive = true;

    await preset.save();
    const populated = await TodoPreset.findById(id)
      .populate("items.category").populate("items.tags").lean();
    return successResponse(populated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update preset";
    return errorResponse(message, 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;
  const { id } = await params;

  try {
    await dbConnect();
    const preset = await TodoPreset.findOneAndDelete({ _id: id, userId });
    if (!preset) return errorResponse("Preset not found", 404);
    return successResponse({ deleted: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete preset";
    return errorResponse(message, 500);
  }
}
