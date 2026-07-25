import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { prisma } from "@/lib/prisma"
import { checkProjectAccess, getClerkIdentity } from "@/lib/project-access"

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

    // Upload canvas JSON to Vercel Blob
    const blob = await put(`canvas/${projectId}.json`, canvasJson, {
      access: "private",
      contentType: "application/json",
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

    // Fetch the canvas JSON from Vercel Blob using the SDK
    const response = await fetch(project.canvasJsonPath)
    if (!response.ok) {
      return NextResponse.json(null)
    }

    const canvasJson = await response.text()
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
