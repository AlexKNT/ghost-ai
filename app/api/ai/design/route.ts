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

  if (!prompt || !roomId) {
    return NextResponse.json(
      { error: "prompt and roomId are required" },
      { status: 400 },
    );
  }

  // 3. Verify project access. The room id *is* the project id in this app, so
  // access is always resolved from the room — a client-supplied project id is
  // never read, let alone trusted.
  const identity = await getClerkIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed, project } = await checkProjectAccess(roomId, identity);
  if (!allowed || !project) {
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
      projectId: project.id,
      userId: identity.userId,
    },
  });

  return NextResponse.json({ runId: handle.id }, { status: 201 });
}
