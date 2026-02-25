import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Todo from "@/models/Todo";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/todos/[id]/move
export async function PATCH(req: NextRequest, { params }: Params) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();
    const { categoryId, order, status } = body;
    if (!categoryId) return errorResponse("categoryId is required");

    const updateData: Record<string, unknown> = { category: categoryId };
    if (order !== undefined) updateData.order = order;
    // Atomic move + status update in single write
    if (status && ["pending", "partial", "completed", "failed"].includes(status)) {
      updateData.status = status;
    }

    const todo = await Todo.findOneAndUpdate({ _id: id, userId }, updateData, {
      returnDocument: "after",
      runValidators: true,
    })
      .populate("category")
      .populate("tags");
    if (!todo) return errorResponse("Todo not found", 404);
    return successResponse(todo);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to move todo";
    return errorResponse(message, 500);
  }
}
