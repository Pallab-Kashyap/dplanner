import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { errorResponse } from "@/lib/apiResponse";
import { NextResponse } from "next/server";

export async function getAuthenticatedUserId(): Promise<{ userId: string } | NextResponse> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session: any = await getServerSession(authOptions as any);

    if (!session?.user) {
      return errorResponse("Unauthorized — please sign in", 401);
    }

    const userId = session.user.id || session.user._id;
    if (!userId) {
      return errorResponse("Unauthorized — user ID not found", 401);
    }

    return { userId: String(userId) };
  } catch (error) {
    console.error("[AuthGuard] Error:", error);
    return errorResponse("Authentication error", 500);
  }
}

export function isErrorResponse(
  result: { userId: string } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
