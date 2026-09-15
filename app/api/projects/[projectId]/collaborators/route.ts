import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

/* -------------------------------------------------------------------------- */
/*  GET — list collaborators enriched with Clerk user data                    */
/* -------------------------------------------------------------------------- */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params

  // Verify project exists and user has access
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  })

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  // Check access: owner or collaborator
  const isOwner = project.ownerId === userId

  if (!isOwner) {
    const clerk = await clerkClient()
    const user = await clerk.users.getUser(userId)
    const email = user.emailAddresses[0]?.emailAddress
    if (!email) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }

    const collab = await prisma.projectCollaborator.findUnique({
      where: { projectId_email: { projectId, email } },
    })
    if (!collab) {
      return Response.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  // Fetch collaborators
  const collaborators = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  })

  // Enrich with Clerk user data
  const emails = collaborators.map((c) => c.email)
  const clerkUsers: Map<string, { firstName: string | null; lastName: string | null; imageUrl: string }> = new Map()

  if (emails.length > 0) {
    try {
      const clerk = await clerkClient()
      const { data } = await clerk.users.getUserList({
        emailAddress: emails,
        limit: emails.length,
      })

      for (const user of data) {
        const primaryEmail = user.emailAddresses.find(
          (e) => e.id === user.primaryEmailAddressId,
        )
        const emailAddr = primaryEmail?.emailAddress ?? user.emailAddresses[0]?.emailAddress
        if (emailAddr) {
          clerkUsers.set(emailAddr.toLowerCase(), {
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
          })
        }
      }
    } catch {
      // If Clerk lookup fails, continue without enrichment
    }
  }

  const enriched = collaborators.map((c) => {
    const clerk = clerkUsers.get(c.email.toLowerCase())
    return {
      id: c.id,
      email: c.email,
      createdAt: c.createdAt,
      displayName: clerk
        ? [clerk.firstName, clerk.lastName].filter(Boolean).join(" ") || c.email
        : c.email,
      avatarUrl: clerk?.imageUrl ?? null,
    }
  })

  return Response.json({ collaborators: enriched, isOwner })
}

/* -------------------------------------------------------------------------- */
/*  POST — invite a collaborator by email (owner only)                        */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params

  // Owner check
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  })

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  if (project.ownerId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  // Parse body
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email || !email.includes("@")) {
    return Response.json({ error: "Valid email is required" }, { status: 400 })
  }

  // Prevent owner from adding themselves
  const clerk = await clerkClient()
  const ownerUser = await clerk.users.getUser(userId)
  const ownerEmail = ownerUser.emailAddresses[0]?.emailAddress?.toLowerCase()
  if (ownerEmail === email) {
    return Response.json(
      { error: "You are the project owner" },
      { status: 400 },
    )
  }

  // Check if already a collaborator
  const existing = await prisma.projectCollaborator.findUnique({
    where: { projectId_email: { projectId, email } },
  })

  if (existing) {
    return Response.json(
      { error: "This person is already a collaborator" },
      { status: 409 },
    )
  }

  const collaborator = await prisma.projectCollaborator.create({
    data: { projectId, email },
  })

  // Enrich with Clerk data
  let displayName = email
  let avatarUrl: string | null = null

  try {
    const { data } = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1,
    })
    const clerkUser = data[0]
    if (clerkUser) {
      displayName =
        [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
        email
      avatarUrl = clerkUser.imageUrl
    }
  } catch {
    // Continue without enrichment
  }

  return Response.json(
    {
      id: collaborator.id,
      email: collaborator.email,
      createdAt: collaborator.createdAt,
      displayName,
      avatarUrl,
    },
    { status: 201 },
  )
}

/* -------------------------------------------------------------------------- */
/*  DELETE — remove a collaborator by email (owner only)                      */
/* -------------------------------------------------------------------------- */

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { projectId } = await params

  // Owner check
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  })

  if (!project) {
    return Response.json({ error: "Not found" }, { status: 404 })
  }

  if (project.ownerId !== userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  // Parse body for email
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase()
  if (!email) {
    return Response.json({ error: "Email is required" }, { status: 400 })
  }

  const existing = await prisma.projectCollaborator.findUnique({
    where: { projectId_email: { projectId, email } },
  })

  if (!existing) {
    return Response.json({ error: "Collaborator not found" }, { status: 404 })
  }

  await prisma.projectCollaborator.delete({
    where: { id: existing.id },
  })

  return Response.json({ success: true })
}
