import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface ClerkIdentity {
  userId: string
  primaryEmail: string | null
}

export interface ProjectAccessResult {
  allowed: boolean
  project: { id: string; name: string; ownerId: string } | null
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Get the current Clerk user identity (userId + primary email).
 * Returns `null` when the user is not authenticated.
 */
export async function getClerkIdentity(): Promise<ClerkIdentity | null> {
  const { userId } = await auth()
  if (!userId) return null

  const user = await currentUser()
  const primaryEmail = user?.emailAddresses?.[0]?.emailAddress ?? null

  return { userId, primaryEmail }
}

/**
 * Check whether the given identity can access a project.
 * Ownership or collaborator membership grants access.
 */
export async function checkProjectAccess(
  projectId: string,
  identity: ClerkIdentity,
): Promise<ProjectAccessResult> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, ownerId: true },
  })

  if (!project) return { allowed: false, project: null }

  // Owner always has access
  if (project.ownerId === identity.userId) {
    return { allowed: true, project }
  }

  // Check collaborator by email
  if (identity.primaryEmail) {
    const collaborator = await prisma.projectCollaborator.findUnique({
      where: {
        projectId_email: { projectId, email: identity.primaryEmail },
      },
    })
    if (collaborator) return { allowed: true, project }
  }

  return { allowed: false, project: null }
}
