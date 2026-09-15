import { auth } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkProjectAccess, getClerkIdentity } from "@/lib/project-access";
import { specFilename } from "@/lib/spec-storage";

export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*  GET /api/projects/[projectId]/specs/[specId]/download                     */
/*                                                                            */
/*  Returns one generated spec as a Markdown attachment. Content lives in     */
/*  Vercel Blob, a private store, so it is read through the SDK after the     */
/*  caller has been checked against the project.                              */
/* -------------------------------------------------------------------------- */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; specId: string }> },
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
  const { projectId, specId } = await params;

  const { allowed, project } = await checkProjectAccess(projectId, identity);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. The spec has to belong to this project. A spec id from anywhere else is
  // a not-found, so project access can never be used to read another project's
  // document.
  const spec = await prisma.projectSpec.findUnique({
    where: { id: specId },
    select: { id: true, projectId: true, filePath: true, createdAt: true },
  })

  if (!spec || spec.projectId !== projectId) {
    return NextResponse.json({ error: "Spec not found" }, { status: 404 });
  }

  // 4. Read the Markdown from the private store and stream it back
  try {
    const blob = await get(spec.filePath, {
      access: "private",
      useCache: false,
    });

    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return NextResponse.json({ error: "Spec file not found" }, { status: 404 });
    }

    return new NextResponse(blob.stream, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${specFilename(project.name, spec.createdAt)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Failed to download spec:", error);
    return NextResponse.json(
      { error: "Failed to download spec" },
      { status: 500 },
    );
  }
}
