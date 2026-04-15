import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import TodoPreset from "@/models/TodoPreset";
import Tag from "@/models/Tag";
import TodoCategory from "@/models/TodoCategory";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

void Tag;
void TodoCategory;

export async function GET() {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const presets = await TodoPreset.find({ userId })
      .sort({ scope: 1, updatedAt: -1 })
      .populate("items.category")
      .populate("items.tags")
      .lean();
    return successResponse(presets);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch todo presets";
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
    const { name, scope, weekdays, items } = body;

    if (!name?.trim()) return errorResponse("name is required");
    if (!["everyday", "custom"].includes(scope)) return errorResponse("scope must be 'everyday' or 'custom'");
    if (!Array.isArray(items) || items.length === 0) return errorResponse("items must be a non-empty array");

    const safeWeekdays = scope === "everyday" ? [0, 1, 2, 3, 4, 5, 6] : weekdays;
    if (scope === "custom" && (!Array.isArray(safeWeekdays) || safeWeekdays.length === 0)) {
      return errorResponse("weekdays required for custom scope");
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    await TodoPreset.updateMany({ userId, scope, isActive: true }, { isActive: false });

    const preset = await TodoPreset.create({
      userId, name: name.trim(), scope, weekdays: safeWeekdays, items,
      isActive: true, effectiveFrom: today,
    });

    const populated = await TodoPreset.findById(preset._id)
      .populate("items.category").populate("items.tags").lean();
    return successResponse(populated, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create todo preset";
    return errorResponse(message, 500);
  }
}
