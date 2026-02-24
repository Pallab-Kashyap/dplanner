import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Tag from "@/models/Tag";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

type Params = { params: Promise<{ id: string }> };

// PUT /api/tags/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    const tag = await Tag.findOneAndUpdate({ _id: id, userId }, body, { new: true, runValidators: true });
    if (!tag) return errorResponse("Tag not found", 404);
    return successResponse(tag);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update tag";
    return errorResponse(message, 500);
  }
}

// DELETE /api/tags/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { id } = await params;

    const tag = await Tag.findOneAndDelete({ _id: id, userId });
    if (!tag) return errorResponse("Tag not found", 404);
    return successResponse({ deleted: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete tag";
    return errorResponse(message, 500);
  }
}
