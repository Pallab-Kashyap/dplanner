import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Todo from "@/models/Todo";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

type Params = { params: Promise<{ id: string }> };

// GET /api/todos/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { id } = await params;
    const todo = await Todo.findOne({ _id: id, userId }).populate("category").populate("tags");
    if (!todo) return errorResponse("Todo not found", 404);
    return successResponse(todo);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch todo";
    return errorResponse(message, 500);
  }
}

// PUT /api/todos/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    if (body.date && typeof body.date === "string") {
      body.date = new Date(body.date + "T00:00:00.000Z");
    }

    const todo = await Todo.findOneAndUpdate({ _id: id, userId }, body, {
      new: true,
      runValidators: true,
    })
      .populate("category")
      .populate("tags");
    if (!todo) return errorResponse("Todo not found", 404);
    return successResponse(todo);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update todo";
    return errorResponse(message, 500);
  }
}

// DELETE /api/todos/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { id } = await params;
    const todo = await Todo.findOneAndDelete({ _id: id, userId });
    if (!todo) return errorResponse("Todo not found", 404);
    return successResponse({ deleted: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete todo";
    return errorResponse(message, 500);
  }
}
