import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import TodoCategory from "@/models/TodoCategory";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

// GET /api/todo-categories
export async function GET() {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const categories = await TodoCategory.find({ userId }).sort({ order: 1 });

    // Seed defaults if none exist for this user
    if (categories.length === 0) {
      const defaults = [
        { userId, name: "Todo", color: "#6366f1", order: 0, isDefault: true, scope: "permanent" },
        { userId, name: "Working", color: "#f59e0b", order: 1, isDefault: true, scope: "permanent" },
        { userId, name: "Completed", color: "#22c55e", order: 2, isDefault: true, scope: "permanent" },
      ];
      const seeded = await TodoCategory.insertMany(defaults);
      return successResponse(seeded);
    }

    return successResponse(categories);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch categories";
    return errorResponse(message, 500);
  }
}

// POST /api/todo-categories
export async function POST(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const body = await req.json();
    const { name, color, order, scope, weekdays, specificDate } = body;
    if (!name) return errorResponse("Name is required");

    // Validate scope
    const validScopes = ["permanent", "everyday", "weekly", "date"];
    const safeScope = scope && validScopes.includes(scope) ? scope : "permanent";

    // Validate weekdays — must be array of numbers 0-6
    const safeWeekdays = Array.isArray(weekdays)
      ? weekdays.filter((w: unknown) => typeof w === "number" && w >= 0 && w <= 6)
      : [];

    // Validate specificDate
    let safeSpecificDate: Date | null = null;
    if (specificDate) {
      const parsed = new Date(specificDate);
      if (!isNaN(parsed.getTime())) safeSpecificDate = parsed;
    }

    let assignedOrder = order;
    if (assignedOrder === undefined) {
      const max = await TodoCategory.findOne({ userId }).sort({ order: -1 });
      assignedOrder = max ? max.order + 1 : 0;
    }

    const category = await TodoCategory.create({
      userId, name, color,
      order: assignedOrder,
      scope: safeScope,
      weekdays: safeWeekdays,
      specificDate: safeSpecificDate,
    });
    return successResponse(category, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create category";
    if (message.includes("duplicate key") || message.includes("E11000")) {
      return errorResponse("A category with this name already exists", 409);
    }
    return errorResponse(message, 500);
  }
}
