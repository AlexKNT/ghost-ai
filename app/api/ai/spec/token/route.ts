import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { issueRunTokenForOwner } from "@/lib/run-token";

export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  POST /api/ai/spec/token                                                   */
/*                                                                            */
/*  Exchanges a spec run id for a token that can read that one run, so the    */
/*  browser can follow the generation through `useRealtimeRun`.               */
/* -------------------------------------------------------------------------- */

interface TokenRequestBody {
  runId?: string;
}

export async function POST(request: Request) {
  // 1. Require Clerk authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse and validate input
  let body: TokenRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const runId = body.runId?.trim();
  if (!runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  // 3. Issue a public token scoped to this run, for its owner only
  const token = await issueRunTokenForOwner(userId, runId);
  if (!token) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json({ token });
}
