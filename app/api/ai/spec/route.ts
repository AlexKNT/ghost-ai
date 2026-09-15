import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess, getClerkIdentity } from "@/lib/project-access";
import { specGenerationRequestSchema } from "@/types/tasks";
import type { generateSpecTask } from "@/src/trigger/generate-spec";

export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  POST /api/ai/spec                                                         */
/*                                                                            */
/*  Starts a background spec generation run for the caller's own project and  */
/*  records the run so the token route can verify ownership later.            */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  // 1. Require Clerk authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse and validate input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = specGenerationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { roomId, nodes, edges, chatHistory } = parsed.data;

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

  // 4. Trigger the spec task in the background
  const handle = await tasks.trigger<typeof generateSpecTask>("generate-spec", {
    projectId: project.id,
    roomId,
    nodes,
    edges,
    chatHistory,
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
