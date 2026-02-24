import { NextRequest } from "next/server";
import dbConnect from "@/lib/db";
import DailyLog from "@/models/DailyLog";
import { successResponse, errorResponse } from "@/lib/apiResponse";
import { getAuthenticatedUserId, isErrorResponse } from "@/lib/authGuard";

// GET /api/analytics?range=week|month|year&date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const authResult = await getAuthenticatedUserId();
  if (isErrorResponse(authResult)) return authResult;
  const { userId } = authResult;

  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "week";
    const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const date = new Date(dateStr + "T00:00:00.000Z");

    let startDate: Date;
    let endDate: Date;

    switch (range) {
      case "week": {
        const day = date.getUTCDay();
        startDate = new Date(date);
        startDate.setUTCDate(startDate.getUTCDate() - day);
        endDate = new Date(startDate);
        endDate.setUTCDate(endDate.getUTCDate() + 7);
        break;
      }
      case "month": {
        startDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
        endDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
        break;
      }
      case "year": {
        startDate = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
        endDate = new Date(Date.UTC(date.getUTCFullYear() + 1, 0, 1));
        break;
      }
      default:
        return errorResponse("range must be week, month, or year");
    }

    const logs = await DailyLog.find({
      userId,
      date: { $gte: startDate, $lt: endDate },
    }).sort({ date: 1 });

    const totalDays = logs.length;
    const totalTasks = logs.reduce((sum, l) => sum + l.totalTasks, 0);
    const totalCompleted = logs.reduce((sum, l) => sum + l.completedTasks, 0);
    const totalPartial = logs.reduce((sum, l) => sum + l.partialTasks, 0);
    const totalFailed = logs.reduce((sum, l) => sum + l.failedTasks, 0);
    const avgCompletionRate =
      totalDays > 0
        ? Math.round(logs.reduce((sum, l) => sum + l.completionRate, 0) / totalDays)
        : 0;

    return successResponse({
      range,
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      summary: { totalDays, totalTasks, totalCompleted, totalPartial, totalFailed, avgCompletionRate },
      dailyLogs: logs,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch analytics";
    return errorResponse(message, 500);
  }
}
