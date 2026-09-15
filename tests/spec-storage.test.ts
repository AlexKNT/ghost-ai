import { describe, expect, it, vi } from "vitest"

import {
  saveProjectSpec,
  specBlobPathname,
  specFilename,
} from "@/lib/spec-storage"

/**
 * Spec storage sits between the generator and the download route: the Markdown
 * belongs in Vercel Blob, the reference belongs in Postgres. Both boundaries are
 * doubles here, so the rules under test are the path/name derivation and exactly
 * what gets persisted.
 */
const blobMock = vi.hoisted(() => ({ put: vi.fn() }))
const prismaMock = vi.hoisted(() => ({ projectSpec: { create: vi.fn() } }))

vi.mock("@vercel/blob", () => blobMock)
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

const SPEC_ID = "6f1c1d3e-5a70-4a5c-9c0e-2b0f4a6d8e10"
const BLOB_URL = `https://blob.example.com/specs/proj_1/${SPEC_ID}.md`
const CREATED_AT = new Date("2026-09-15T10:39:00.000Z")

/* -------------------------------------------------------------------------- */
/*  Path and filename rules                                                   */
/* -------------------------------------------------------------------------- */

describe("specBlobPathname", () => {
  it("keeps specs one file per record, scoped to their project", () => {
    expect(specBlobPathname("proj_1", SPEC_ID)).toBe(
      `specs/proj_1/${SPEC_ID}.md`,
    )
  })
})

describe("specFilename", () => {
  it("derives a readable name from the project and the spec date", () => {
    expect(specFilename("Payments Platform", CREATED_AT)).toBe(
      "payments-platform-spec-2026-09-15.md",
    )
  })

  it("survives project names that slug to nothing", () => {
    expect(specFilename("", CREATED_AT)).toBe("spec-2026-09-15.md")
    expect(specFilename("   ", CREATED_AT)).toBe("spec-2026-09-15.md")
    expect(specFilename("***", CREATED_AT)).toBe("spec-2026-09-15.md")
  })

  it("trims separator runs instead of leaving them in the name", () => {
    expect(specFilename("  Ghost  AI  ", CREATED_AT)).toBe(
      "ghost-ai-spec-2026-09-15.md",
    )
    expect(specFilename("Ghost / AI", CREATED_AT)).toBe(
      "ghost-ai-spec-2026-09-15.md",
    )
  })

  it("caps the slug length and never emits header-unsafe characters", () => {
    const filename = specFilename("A".repeat(200), CREATED_AT)

    expect(filename).toBe(`${"a".repeat(60)}-spec-2026-09-15.md`)
    expect(filename).toMatch(/^[a-z0-9.-]+\.md$/)
  })
})

/* -------------------------------------------------------------------------- */
/*  Persistence                                                               */
/* -------------------------------------------------------------------------- */

describe("saveProjectSpec", () => {
  it("uploads the Markdown privately and stores the reference", async () => {
    blobMock.put.mockResolvedValue({ url: BLOB_URL })
    prismaMock.projectSpec.create.mockImplementation(
      ({ data }: { data: { id: string; projectId: string; filePath: string } }) =>
        Promise.resolve({ ...data, createdAt: CREATED_AT }),
    )

    const spec = await saveProjectSpec({
      projectId: "proj_1",
      content: "# Payments\n\nBody",
    })

    expect(blobMock.put).toHaveBeenCalledTimes(1)

    const [pathname, content, options] = blobMock.put.mock.calls[0] as [
      string,
      string,
      { access: string; contentType: string; addRandomSuffix: boolean },
    ]
    const specId = pathname.replace("specs/proj_1/", "").replace(".md", "")

    expect(pathname).toBe(specBlobPathname("proj_1", specId))
    expect(content).toBe("# Payments\n\nBody")
    expect(options.access).toBe("private")
    expect(options.addRandomSuffix).toBe(false)
    expect(options.contentType).toContain("text/markdown")

    // The row id must be the id in the blob path, or the file can't be found.
    expect(prismaMock.projectSpec.create).toHaveBeenCalledWith({
      data: { id: specId, projectId: "proj_1", filePath: BLOB_URL },
      select: { id: true, projectId: true, filePath: true, createdAt: true },
    })
    expect(spec).toEqual({
      id: specId,
      projectId: "proj_1",
      filePath: BLOB_URL,
      createdAt: CREATED_AT,
    })
  })

  it("writes no database record when the upload fails", async () => {
    blobMock.put.mockRejectedValue(new Error("blob store unavailable"))

    await expect(
      saveProjectSpec({ projectId: "proj_1", content: "# Payments" }),
    ).rejects.toThrow("blob store unavailable")

    expect(prismaMock.projectSpec.create).not.toHaveBeenCalled()
  })
})
