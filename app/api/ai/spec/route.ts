import { auth } from "@clerk/nextjs/server";
import { tasks } from "@trigger.dev/sdk";
import { NextResponse } from "next/server";
import { readChatHistory } from "@/lib/liveblocks-agent";
import { readCanvasSnapshot } from "@/lib/liveblocks-flow";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess, getClerkIdentity } from "@/lib/project-access";
import { specGenerationRequestSchema } from "@/types/tasks";
import type { generateSpecTask } from "@/src/trigger/generate-spec";

export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  POST /api/ai/spec                                                         */
/*                                                                            */
/*  Starts a background spec run for the caller's own project. The canvas and  */
/*  the conversation are read from the room itself, so a spec always describes */
/*  what the room actually holds; the run is recorded so the token route can   */
/*  verify ownership later.                                                   */
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

  const { roomId } = parsed.data;

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

  // 4. Read what the spec describes straight from the room. A spec summarizes
  // the shared design, so neither half of the input comes from the client: the
  // canvas is the collaborative document and the conversation is the room's
  // chat feed.
  const canvas = await readCanvasSnapshot(roomId);

  const nodes = canvas.nodes.map((node) => ({
    id: node.id,
    label: node.label,
    shape: node.shape,
    color: node.color,
  }));

  if (nodes.length === 0) {
    return NextResponse.json(
      { error: "The canvas is empty — add components before generating a spec" },
      { status: 400 },
    );
  }

  const edges = canvas.edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    label: edge.label,
  }));

  const chatHistory = await readChatHistory(roomId);

  // 5. Trigger the spec task in the background
  const handle = await tasks.trigger<typeof generateSpecTask>("generate-spec", {
    projectId: project.id,
    roomId,
    nodes,
    edges,
    chatHistory,
  });

  // 6. Track the run so the token route can verify ownership later
  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId: project.id,
      userId: identity.userId,
    },
  });

  return NextResponse.json({ runId: handle.id }, { status: 201 });
}
