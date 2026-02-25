import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import TodoCategory from "@/models/TodoCategory";
import Todo from "@/models/Todo";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

type Params = { params: Promise<{ id: string }> };

// PUT /api/todo-categories/[id]
export async function PUT(req: NextRequest, { params }: Params) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { id } = await params;
    const body = await req.json();

    // Whitelist allowed fields — prevent userId, isDefault escalation
    const allowed: Record<string, unknown> = {};
    if (body.name !== undefined) allowed.name = String(body.name).trim();
    if (body.color !== undefined) allowed.color = String(body.color);
    if (body.order !== undefined) allowed.order = Number(body.order);
    if (body.scope !== undefined) {
      const validScopes = ["permanent", "everyday", "weekly", "date"];
      if (validScopes.includes(body.scope)) allowed.scope = body.scope;
    }
    if (body.weekdays !== undefined && Array.isArray(body.weekdays)) {
      allowed.weekdays = body.weekdays.filter((w: unknown) => typeof w === "number" && w >= 0 && w <= 6);
    }
    if (body.specificDate !== undefined) {
      allowed.specificDate = body.specificDate ? new Date(body.specificDate) : null;
    }

    if (Object.keys(allowed).length === 0) {
      return errorResponse("No valid fields to update", 400);
    }

    const category = await TodoCategory.findOneAndUpdate({ _id: id, userId }, allowed, {
      returnDocument: "after",
      runValidators: true,
    });
    if (!category) return errorResponse("Category not found", 404);
    return successResponse(category);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update category";
    return errorResponse(message, 500);
  }
}

// DELETE /api/todo-categories/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { id } = await params;

    const category = await TodoCategory.findOne({ _id: id, userId });
    if (!category) return errorResponse("Category not found", 404);
    if (category.isDefault) return errorResponse("Cannot delete a default category", 403);

    // Reassign orphaned todos to the default "Todo" category
    const defaultCategory = await TodoCategory.findOne({ userId, isDefault: true, name: "Todo" });
    if (defaultCategory) {
      await Todo.updateMany(
        { userId, category: category._id },
        { $set: { category: defaultCategory._id } }
      );
    }

    await category.deleteOne();
    return successResponse({ deleted: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete category";
    return errorResponse(message, 500);
  }
}
