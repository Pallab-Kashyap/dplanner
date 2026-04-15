import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import UserSettings from "@/models/UserSettings";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

export async function GET() {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const settings = await UserSettings.findOneAndUpdate(
      { userId },
      { $setOnInsert: { userId, theme: "light", schedulePriority: "custom", todoPriority: "custom" } },
      { upsert: true, returnDocument: "after" }
    ).lean();
    return successResponse(settings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch settings";
    return errorResponse(message, 500);
  }
}

export async function PUT(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const body = await req.json();
    const update: Record<string, string> = {};

    if (body.theme && ["light", "dark"].includes(body.theme)) update.theme = body.theme;
    if (body.schedulePriority && ["custom", "everyday"].includes(body.schedulePriority)) update.schedulePriority = body.schedulePriority;
    if (body.todoPriority && ["custom", "everyday"].includes(body.todoPriority)) update.todoPriority = body.todoPriority;

    const settings = await UserSettings.findOneAndUpdate(
      { userId },
      { ...update },
      { upsert: true, returnDocument: "after" }
    ).lean();
    return successResponse(settings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update settings";
    return errorResponse(message, 500);
  }
}
