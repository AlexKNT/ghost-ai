import { describe, expect, it, vi } from "vitest"

import { checkProjectAccess, getClerkIdentity } from "@/lib/project-access"

/**
 * Ownership and collaborator checks sit on every mutation boundary, so they are
 * tested against Clerk and Prisma doubles rather than a live database.
 */
const clerkMock = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}))

const prismaMock = vi.hoisted(() => ({
  project: { findUnique: vi.fn() },
  projectCollaborator: { findUnique: vi.fn() },
}))

vi.mock("@clerk/nextjs/server", () => clerkMock)
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

const PROJECT = { id: "proj_1", name: "Payments", ownerId: "user_owner" }

describe("getClerkIdentity", () => {
  it("returns null when nobody is signed in", async () => {
    clerkMock.auth.mockResolvedValue({ userId: null })

    await expect(getClerkIdentity()).resolves.toBeNull()
    expect(clerkMock.currentUser).not.toHaveBeenCalled()
  })

  it("returns the user id with the primary email", async () => {
    clerkMock.auth.mockResolvedValue({ userId: "user_1" })
    clerkMock.currentUser.mockResolvedValue({
      emailAddresses: [{ emailAddress: "dev@example.com" }],
    })

    await expect(getClerkIdentity()).resolves.toEqual({
      userId: "user_1",
      primaryEmail: "dev@example.com",
    })
  })

  it("falls back to a null email when Clerk has no profile or addresses", async () => {
    clerkMock.auth.mockResolvedValue({ userId: "user_1" })

    clerkMock.currentUser.mockResolvedValue(null)
    await expect(getClerkIdentity()).resolves.toEqual({
      userId: "user_1",
      primaryEmail: null,
    })

    clerkMock.currentUser.mockResolvedValue({ emailAddresses: [] })
    await expect(getClerkIdentity()).resolves.toEqual({
      userId: "user_1",
      primaryEmail: null,
    })
  })
})

describe("checkProjectAccess", () => {
  it("denies access when the project does not exist", async () => {
    prismaMock.project.findUnique.mockResolvedValue(null)

    await expect(
      checkProjectAccess("proj_missing", {
        userId: "user_1",
        primaryEmail: "dev@example.com",
      }),
    ).resolves.toEqual({ allowed: false, project: null })

    expect(prismaMock.projectCollaborator.findUnique).not.toHaveBeenCalled()
  })

  it("grants access to the owner without a collaborator lookup", async () => {
    prismaMock.project.findUnique.mockResolvedValue(PROJECT)

    await expect(
      checkProjectAccess("proj_1", {
        userId: "user_owner",
        primaryEmail: null,
      }),
    ).resolves.toEqual({ allowed: true, project: PROJECT })

    expect(prismaMock.projectCollaborator.findUnique).not.toHaveBeenCalled()
  })

  it("grants access to an invited collaborator", async () => {
    prismaMock.project.findUnique.mockResolvedValue(PROJECT)
    prismaMock.projectCollaborator.findUnique.mockResolvedValue({
      projectId: "proj_1",
      email: "guest@example.com",
    })

    await expect(
      checkProjectAccess("proj_1", {
        userId: "user_guest",
        primaryEmail: "guest@example.com",
      }),
    ).resolves.toEqual({ allowed: true, project: PROJECT })

    expect(prismaMock.projectCollaborator.findUnique).toHaveBeenCalledWith({
      where: {
        projectId_email: { projectId: "proj_1", email: "guest@example.com" },
      },
    })
  })

  it("denies access to a signed-in stranger", async () => {
    prismaMock.project.findUnique.mockResolvedValue(PROJECT)
    prismaMock.projectCollaborator.findUnique.mockResolvedValue(null)

    await expect(
      checkProjectAccess("proj_1", {
        userId: "user_other",
        primaryEmail: "other@example.com",
      }),
    ).resolves.toEqual({ allowed: false, project: null })
  })

  it("denies access without an email instead of querying collaborators", async () => {
    prismaMock.project.findUnique.mockResolvedValue(PROJECT)

    await expect(
      checkProjectAccess("proj_1", { userId: "user_other", primaryEmail: null }),
    ).resolves.toEqual({ allowed: false, project: null })

    expect(prismaMock.projectCollaborator.findUnique).not.toHaveBeenCalled()
  })
})
