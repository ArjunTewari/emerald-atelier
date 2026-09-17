import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const workerUrl = process.env.RAILWAY_AGENT_URL;
  if (!workerUrl) return NextResponse.json({ connected: false });

  try {
    const response = await fetch(`${workerUrl.replace(/\/$/, "")}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    return NextResponse.json({ connected: response.ok });
  } catch {
    return NextResponse.json({ connected: false });
  }
}
