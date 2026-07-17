"use client"

import { useState, useCallback, useMemo } from "react"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface MockProject {
  id: string
  name: string
  slug: string
  owned: boolean
}

export type DialogId = "create" | "rename" | "delete" | null

interface ProjectDialogsState {
  /** Which dialog is currently open (or null). */
  active: DialogId
  /** The project targeted by the dialog (rename / delete). */
  target: MockProject | null
  /** Controlled value for the name input. */
  name: string
  /** Derived live slug preview. */
  slug: string
  /** Loading flag for submit actions. */
  loading: boolean
}

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

/* -------------------------------------------------------------------------- */
/*  Hook                                                                      */
/* -------------------------------------------------------------------------- */

export function useProjectDialogs() {
  const [state, setState] = useState<ProjectDialogsState>({
    active: null,
    target: null,
    name: "",
    slug: "",
    loading: false,
  })

  /* ---- open / close ------------------------------------------------------ */

  const openCreate = useCallback(() => {
    setState({ active: "create", target: null, name: "", slug: "", loading: false })
  }, [])

  const openRename = useCallback((project: MockProject) => {
    setState({
      active: "rename",
      target: project,
      name: project.name,
      slug: project.slug,
      loading: false,
    })
  }, [])

  const openDelete = useCallback((project: MockProject) => {
    setState({
      active: "delete",
      target: project,
      name: project.name,
      slug: project.slug,
      loading: false,
    })
  }, [])

  const closeDialog = useCallback(() => {
    setState((prev) => ({ ...prev, active: null, target: null }))
  }, [])

  /* ---- name input -------------------------------------------------------- */

  const setName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, name, slug: nameToSlug(name) }))
  }, [])

  /* ---- loading ----------------------------------------------------------- */

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }))
  }, [])

  /* ---- convenience ------------------------------------------------------- */

  const isOpen = useCallback(
    (id: DialogId): boolean => state.active === id,
    [state.active],
  )

  const dialogState = useMemo(() => state, [state])

  return {
    ...dialogState,
    openCreate,
    openRename,
    openDelete,
    closeDialog,
    setName,
    setLoading,
    isOpen,
  }
}
