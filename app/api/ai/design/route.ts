import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess, getClerkIdentity } from "@/lib/project-access";
import type { designAgentTask } from "@/src/trigger/design-agent";

export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  POST /api/ai/design                                                       */
/* -------------------------------------------------------------------------- */

interface DesignRequestBody {
  prompt?: string;
  roomId?: string;
  projectId?: string;
}

export async function POST(request: Request) {
  // 1. Require Clerk authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse and validate input
  let body: DesignRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  const roomId = body.roomId?.trim();
  const projectId = body.projectId?.trim();

  if (!prompt || !roomId || !projectId) {
    return NextResponse.json(
      { error: "prompt, roomId, and projectId are required" },
      { status: 400 },
    );
  }

  // 3. Verify project access
  const identity = await getClerkIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkProjectAccess(projectId, identity);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Trigger the design task in the background
  const handle = await tasks.trigger<typeof designAgentTask>("design-agent", {
    prompt,
    roomId,
  });

  // 5. Track the run so the token route can verify ownership later
  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId,
      userId: identity.userId,
    },
  });

  return NextResponse.json({ runId: handle.id }, { status: 201 });
}
