import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import User from "@/models/User";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

// GET /api/me — returns current user info
export async function GET(_req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;

  try {
    await dbConnect();
    // Extract createdAt from ObjectId timestamp (works even if document lacks createdAt)
    const objectId = new mongoose.Types.ObjectId(authResult.userId);
    const createdFromId = objectId.getTimestamp().toISOString().split("T")[0];

    const user = await User.findById(objectId).select("name email image createdAt");
    if (!user) {
      return successResponse({
        name: "User",
        email: "",
        image: "",
        createdAt: createdFromId,
      });
    }

    return successResponse({
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt
        ? user.createdAt.toISOString().split("T")[0]
        : createdFromId,
    });
  } catch (error: unknown) {
    console.error("API /api/me error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch user";
    return errorResponse(message, 500);
  }
}
