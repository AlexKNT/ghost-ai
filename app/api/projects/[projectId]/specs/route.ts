import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess, getClerkIdentity } from "@/lib/project-access";
import { specFilename } from "@/lib/spec-storage";

export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  GET /api/projects/[projectId]/specs                                       */
/*                                                                            */
/*  Lists a project's generated specs, newest first. Metadata only: the blob  */
/*  reference is deliberately not returned, so the client can never reach a   */
/*  private file except through the download route.                           */
/* -------------------------------------------------------------------------- */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  // 1. Require Clerk authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await getClerkIdentity();
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Verify the project exists and the caller can access it
  const { projectId } = await params;

  const { allowed, project } = await checkProjectAccess(projectId, identity);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const specs = await prisma.projectSpec.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json(
    specs.map((spec) => ({
      id: spec.id,
      createdAt: spec.createdAt.toISOString(),
      // Derived server-side so every surface shows the same download name.
      filename: specFilename(project.name, spec.createdAt),
    })),
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
