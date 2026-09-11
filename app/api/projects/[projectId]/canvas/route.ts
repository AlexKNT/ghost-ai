import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { get, put } from "@vercel/blob"
import { prisma } from "@/lib/prisma"
import { checkProjectAccess, getClerkIdentity } from "@/lib/project-access"

/** Canvas blobs are stored under a deterministic, project-scoped pathname. */
function canvasPathname(projectId: string) {
  return `canvas/${projectId}.json`
}

/* -------------------------------------------------------------------------- */
/*  PUT /api/projects/[projectId]/canvas — Save canvas state                  */
/* -------------------------------------------------------------------------- */

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const identity = await getClerkIdentity()
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const { allowed } = await checkProjectAccess(projectId, identity)
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const canvasJson = await request.text()

    // Validate the payload before persisting — an invalid blob would break loads.
    let parsed: unknown
    try {
      parsed = JSON.parse(canvasJson)
    } catch {
      return NextResponse.json({ error: "Invalid canvas JSON" }, { status: 400 })
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as { nodes?: unknown }).nodes) ||
      !Array.isArray((parsed as { edges?: unknown }).edges)
    ) {
      return NextResponse.json(
        { error: "Canvas must contain nodes and edges arrays" },
        { status: 400 },
      )
    }

    // Upload canvas JSON to Vercel Blob (overwrite the existing snapshot)
    const blob = await put(canvasPathname(projectId), canvasJson, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    })

    // Store the blob URL on the Prisma project record
    await prisma.project.update({
      where: { id: projectId },
      data: { canvasJsonPath: blob.url },
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error("Failed to save canvas:", error)
    return NextResponse.json(
      { error: "Failed to save canvas" },
      { status: 500 },
    )
  }
}

/* -------------------------------------------------------------------------- */
/*  GET /api/projects/[projectId]/canvas — Load canvas state                  */
/* -------------------------------------------------------------------------- */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const identity = await getClerkIdentity()
  if (!identity) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params
  const { allowed } = await checkProjectAccess(projectId, identity)
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    // Read the project's saved blob URL from Prisma
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { canvasJsonPath: true },
    })

    if (!project?.canvasJsonPath) {
      return NextResponse.json(null)
    }

    // Fetch the canvas JSON from Vercel Blob. Private blobs are only readable
    // through the authenticated SDK, not a bare fetch(). `useCache: false`
    // guarantees the latest snapshot rather than a cached copy.
    const blob = await get(project.canvasJsonPath, {
      access: "private",
      useCache: false,
    })

    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return NextResponse.json(null)
    }

    const canvasJson = await new Response(blob.stream).text()

    return new NextResponse(canvasJson, {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Failed to load canvas:", error)
    return NextResponse.json(
      { error: "Failed to load canvas" },
      { status: 500 },
    )
  }
}
