import { randomUUID } from "node:crypto"

import { put } from "@vercel/blob"

import { prisma } from "@/lib/prisma"

/* -------------------------------------------------------------------------- */
/*  Spec artifacts                                                            */
/*                                                                            */
/*  Metadata belongs in Postgres, the Markdown itself belongs in Vercel Blob  */
/*  — the same split canvas persistence uses: records keep only the blob    */
/*  reference, so no spec content ever reaches the database.                  */
/* -------------------------------------------------------------------------- */

/** Where a spec's Markdown lives in Blob storage: one file per spec record. */
export function specBlobPathname(projectId: string, specId: string): string {
  return `specs/${projectId}/${specId}.md`
}

/** Keeps the derived download name short enough for every filesystem. */
const FILENAME_SLUG_MAX_LENGTH = 60

/**
 * Download name for a spec: `<project>-spec-<yyyy-mm-dd>.md`.
 *
 * Derived rather than stored: the record only needs the blob reference, and a
 * name computed from the project and the spec's creation date stays readable
 * without adding a column. The slug is reduced to `[a-z0-9-]`, so the result is
 * always safe to put in a `Content-Disposition` header.
 */
export function specFilename(projectName: string, createdAt: Date): string {
  const slug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, FILENAME_SLUG_MAX_LENGTH)

  const date = createdAt.toISOString().slice(0, 10)

  return slug ? `${slug}-spec-${date}.md` : `spec-${date}.md`
}

/** The parts of a stored spec the rest of the app needs. */
export interface StoredSpec {
  id: string
  projectId: string
  filePath: string
  createdAt: Date
}

/**
 * Stores a generated Markdown spec.
 *
 * The id is generated here rather than by the database default because it names
 * the blob pathname as well as the row, which keeps `specs/{projectId}/{specId}.md`
 * and the record pointing at each other. Nothing is written to the database if
 * the upload fails, and the blob pathname is unique per spec, so a retry can
 * never overwrite an earlier spec.
 */
export async function saveProjectSpec({
  projectId,
  content,
}: {
  projectId: string
  content: string
}): Promise<StoredSpec> {
  const specId = randomUUID()

  const blob = await put(specBlobPathname(projectId, specId), content, {
    access: "private",
    contentType: "text/markdown; charset=utf-8",
    addRandomSuffix: false,
  })

  return prisma.projectSpec.create({
    data: { id: specId, projectId, filePath: blob.url },
    select: { id: true, projectId: true, filePath: true, createdAt: true },
  })
}
