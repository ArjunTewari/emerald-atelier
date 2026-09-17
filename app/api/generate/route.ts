import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function POST(request: NextRequest) {
  const accessCode = process.env.APP_ACCESS_CODE;
  const workerUrl = process.env.RAILWAY_AGENT_URL;
  const sharedSecret = process.env.AGENT_SHARED_SECRET;

  if (!accessCode || !workerUrl || !sharedSecret) {
    return NextResponse.json({ error: "The generation worker has not been connected yet." }, { status: 503 });
  }

  const suppliedCode = request.headers.get("x-access-code") || "";
  if (!safeEqual(suppliedCode, accessCode)) {
    return NextResponse.json({ error: "That studio access code is not valid." }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 12 * 1024 * 1024) {
    return NextResponse.json({ error: "The upload is too large." }, { status: 413 });
  }

  try {
    const payload = await request.json();
    const response = await fetch(`${workerUrl.replace(/\/$/, "")}/v1/generate`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${sharedSecret}`,
        "content-type": "application/json",
        "x-forwarded-for": request.headers.get("x-forwarded-for") || "vercel",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(290_000),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json(
      { error: timedOut ? "The generation took too long. Please try again." : "The Railway agent could not be reached." },
      { status: timedOut ? 504 : 502 },
    );
  }
}
