import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Feedback from "@/models/Feedback";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

// POST /api/feedback
export async function POST(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const userId = new mongoose.Types.ObjectId(authResult.userId);

  try {
    await dbConnect();
    const body = await req.json();
    const { suggestion, rating } = body;

    if (!suggestion?.trim() && rating === null) {
      return errorResponse("Please provide feedback or a rating", 400);
    }

    const feedback = await Feedback.create({
      userId,
      suggestion: suggestion?.trim() || "",
      rating: typeof rating === "number" && rating >= 0 && rating <= 4 ? rating : null,
    });

    return successResponse(feedback, 201);
  } catch (error: unknown) {
    console.error("Feedback API error:", error);
    const message = error instanceof Error ? error.message : "Failed to save feedback";
    return errorResponse(message, 500);
  }
}
