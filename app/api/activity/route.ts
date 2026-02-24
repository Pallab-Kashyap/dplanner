import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import DailyLog from "@/models/DailyLog";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

// GET /api/activity?year=2026
export async function GET(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get("year") || new Date().getFullYear().toString();
    const year = parseInt(yearStr);

    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year + 1, 0, 1));

    const logs = await DailyLog.find({
      userId,
      date: { $gte: startDate, $lt: endDate },
    }).sort({ date: 1 });

    const heatmap = logs.map((log) => {
      let level = 0;
      if (log.completionRate > 0) level = 1;
      if (log.completionRate >= 25) level = 2;
      if (log.completionRate >= 50) level = 3;
      if (log.completionRate >= 75) level = 4;

      return {
        date: log.date.toISOString().split("T")[0],
        completionRate: log.completionRate,
        totalTasks: log.totalTasks,
        completedTasks: log.completedTasks,
        level,
      };
    });

    return successResponse({ year, heatmap });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch activity";
    return errorResponse(message, 500);
  }
}
