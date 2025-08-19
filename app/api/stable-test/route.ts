import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "✅ Stable endpoint working",
    timestamp: new Date().toISOString(),
    message: "No hot reload interference",
    fixes_applied: [
      "✅ Disabled Turbo mode",
      "✅ Disabled hot reload",
      "✅ Disabled fast refresh", 
      "✅ Blocked RSC payload fetches",
      "✅ Blocked HMR WebSocket connections",
      "✅ Safe navigation implemented",
      "✅ Error boundaries active"
    ],
    recommendation: "Use full page refreshes instead of hot reload for stability"
  });
}
