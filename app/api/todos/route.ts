import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import Todo from "@/models/Todo";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

// GET /api/todos?date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");
    if (!dateStr) return errorResponse("date query parameter is required (YYYY-MM-DD)");

    const date = new Date(dateStr + "T00:00:00.000Z");
    const nextDay = new Date(date);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const todos = await Todo.find({ userId, date: { $gte: date, $lt: nextDay } })
      .populate("category")
      .populate("tags")
      .sort({ order: 1 });

    return successResponse(todos);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch todos";
    return errorResponse(message, 500);
  }
}

// POST /api/todos
export async function POST(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const body = await req.json();
    const { title, description, category, status, statusNote, tags, date, order } = body;

    if (!title) return errorResponse("Title is required");
    if (!category) return errorResponse("Category is required");
    if (!date) return errorResponse("Date is required");

    let assignedOrder = order;
    if (assignedOrder === undefined) {
      const d = new Date(date + "T00:00:00.000Z");
      const nextDay = new Date(d);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const max = await Todo.findOne({ userId, date: { $gte: d, $lt: nextDay }, category }).sort({
        order: -1,
      });
      assignedOrder = max ? max.order + 1 : 0;
    }

    const todo = await Todo.create({
      userId,
      title,
      description,
      category,
      status,
      statusNote,
      tags: tags || [],
      date: new Date(date + "T00:00:00.000Z"),
      order: assignedOrder,
    });

    const populated = await todo.populate(["category", "tags"]);
    return successResponse(populated, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create todo";
    return errorResponse(message, 500);
  }
}
