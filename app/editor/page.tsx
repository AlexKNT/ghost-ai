import { auth, currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"
import { EditorHome } from "@/components/editor/editor-home"

import type { ProjectSummary } from "@/hooks/useProjectActions"

export default async function EditorPage() {
  const { userId } = await auth()

  let ownedProjects: ProjectSummary[] = []
  let sharedProjects: ProjectSummary[] = []

  if (userId) {
    const user = await currentUser()
    const primaryEmail = user?.emailAddresses?.[0]?.emailAddress

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

    ownedProjects = owned.map((p) => ({ ...p, owned: true }))
    sharedProjects = shared.map((p) => ({ ...p, owned: false }))
  }

  return (
    <EditorHome ownedProjects={ownedProjects} sharedProjects={sharedProjects} />
  )
}
