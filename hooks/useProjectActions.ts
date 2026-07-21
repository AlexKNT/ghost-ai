"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface ProjectSummary {
  id: string
  name: string
  description: string | null
  owned: boolean
}

export type DialogId = "create" | "rename" | "delete" | null

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

function generateSuffix(): string {
  return Math.random().toString(36).substring(2, 6)
}

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

export function useProjectActions() {
  const router = useRouter()

  const [active, setActive] = useState<DialogId>(null)
  const [target, setTarget] = useState<ProjectSummary | null>(null)
  const [name, setNameState] = useState("")
  const [loading, setLoading] = useState(false)

  const slug = nameToSlug(name)

  /* ---- open / close ------------------------------------------------------ */

  const openCreate = useCallback(() => {
    setActive("create")
    setTarget(null)
    setNameState("")
    setLoading(false)
  }, [])

  const openRename = useCallback((project: ProjectSummary) => {
    setActive("rename")
    setTarget(project)
    setNameState(project.name)
    setLoading(false)
  }, [])

  const openDelete = useCallback((project: ProjectSummary) => {
    setActive("delete")
    setTarget(project)
    setNameState(project.name)
    setLoading(false)
  }, [])

  const closeDialog = useCallback(() => {
    setActive(null)
    setTarget(null)
  }, [])

  /* ---- name input -------------------------------------------------------- */

  const setName = useCallback((value: string) => {
    setNameState(value)
  }, [])

  /* ---- mutations --------------------------------------------------------- */

  const createProject = useCallback(async () => {
    if (name.trim().length === 0) return
    setLoading(true)
    try {
      const roomId = `${slug}-${generateSuffix()}`
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), id: roomId }),
      })
      if (!res.ok) throw new Error("Failed to create project")
      const project: ProjectSummary = await res.json()
      router.push(`/editor/${project.id}`)
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }, [name, slug, router])

  const renameProject = useCallback(async () => {
    if (!target || name.trim().length === 0) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) throw new Error("Failed to rename project")
      router.refresh()
      closeDialog()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }, [target, name, router, closeDialog])

  const deleteProject = useCallback(async () => {
    if (!target) return
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${target.id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete project")
      router.refresh()
      closeDialog()
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }, [target, router, closeDialog])

  /* ---- convenience ------------------------------------------------------- */

  const isOpen = useCallback(
    (id: DialogId): boolean => active === id,
    [active],
  )

  return {
    active,
    target,
    name,
    slug,
    loading,
    setName,
    openCreate,
    openRename,
    openDelete,
    closeDialog,
    createProject,
    renameProject,
    deleteProject,
    isOpen,
  }
}
