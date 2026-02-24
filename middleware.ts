import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Minimal middleware — just pass through.
// API auth is handled by lib/authGuard.ts.
// Page auth is handled by (app)/layout.tsx.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
