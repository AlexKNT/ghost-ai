import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"
import { getClerkIdentity, checkProjectAccess } from "@/lib/project-access"
import { AccessDenied } from "@/components/editor/access-denied"
import { WorkspaceShell } from "@/components/editor/workspace-shell"

import type { ProjectSummary } from "@/hooks/useProjectActions"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface EditorRoomPageProps {
  params: Promise<{ roomId: string }>
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function EditorRoomPage({ params }: EditorRoomPageProps) {
  const { roomId } = await params

  // 1. Auth — unauthenticated users redirect to sign-in
  const { userId } = await auth()
  if (!userId) {
    redirect("/sign-in")
  }

  // 2. Identity
  const identity = await getClerkIdentity()
  if (!identity) {
    redirect("/sign-in")
  }

  // 3. Project access — non-existent or unauthorized show AccessDenied
  const { allowed, project } = await checkProjectAccess(roomId, identity)
  if (!allowed || !project) {
    return <AccessDenied />
  }

  // 4. Fetch sidebar projects (same pattern as editor home page)
  const primaryEmail = identity.primaryEmail

  const [owned, shared] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, description: true },
    }),
    primaryEmail
      ? prisma.project.findMany({
          where: { collaborators: { some: { email: primaryEmail } } },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, description: true },
        })
      : ([] as { id: string; name: string; description: string | null }[]),
  ])

  const ownedProjects: ProjectSummary[] = owned.map((p) => ({
    ...p,
    owned: true,
  }))
  const sharedProjects: ProjectSummary[] = shared.map((p) => ({
    ...p,
    owned: false,
  }))

  return (
    <WorkspaceShell
      projectId={project.id}
      projectName={project.name}
      ownedProjects={ownedProjects}
      sharedProjects={sharedProjects}
    />
  )
}
