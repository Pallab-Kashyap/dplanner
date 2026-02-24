import dbConnect from "@/lib/db";
import Tag from "@/models/Tag";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";
import { NextRequest } from "next/server";

// GET /api/tags
export async function GET() {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const tags = await Tag.find({ userId }).sort({ name: 1 });
    return successResponse(tags);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch tags";
    return errorResponse(message, 500);
  }
}

// POST /api/tags
export async function POST(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const body = await req.json();
    const { name, color } = body;
    if (!name) return errorResponse("Name is required");

    const tag = await Tag.create({ userId, name, color });
    return successResponse(tag, 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create tag";
    if (message.includes("duplicate key") || message.includes("E11000")) {
      return errorResponse("A tag with this name already exists", 409);
    }
    return errorResponse(message, 500);
  }
}
