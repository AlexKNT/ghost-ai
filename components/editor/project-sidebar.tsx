"use client"

import { MoreHorizontal, Plus, X, Pencil, Trash2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

import type { ProjectSummary } from "@/hooks/useProjectActions"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  ownedProjects: ProjectSummary[]
  sharedProjects: ProjectSummary[]
  onNewProject?: () => void
  onRenameProject?: (project: ProjectSummary) => void
  onDeleteProject?: (project: ProjectSummary) => void
}

/* -------------------------------------------------------------------------- */
/*  Empty State                                                               */
/* -------------------------------------------------------------------------- */

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-12">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-subtle">
        <svg
          className="size-6 text-copy-faint"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
          />
        </svg>
      </div>
      <p className="text-sm text-copy-muted">No {label.toLowerCase()} projects yet</p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Project Item                                                              */
/* -------------------------------------------------------------------------- */

function ProjectItem({
  project,
  onRename,
  onDelete,
}: {
  project: ProjectSummary
  onRename?: (project: ProjectSummary) => void
  onDelete?: (project: ProjectSummary) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [menuOpen])

  return (
    <div
      className={cn(
        "group flex items-center justify-between rounded-xl px-3 py-2 transition-colors",
        "hover:bg-subtle"
      )}
    >
      <span className="truncate text-sm text-copy-secondary">{project.name}</span>

      {/* Actions — only for owned projects */}
      {project.owned && (
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((prev) => !prev)
            }}
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-lg transition-all",
              "text-copy-muted opacity-0 group-hover:opacity-100",
              "hover:bg-elevated hover:text-copy-primary",
              menuOpen && "opacity-100 bg-elevated text-copy-primary"
            )}
            aria-label="Project actions"
          >
            <MoreHorizontal className="size-3.5" />
          </button>

          {menuOpen && (
            <div
              className={cn(
                "absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-xl",
                "border border-border bg-elevated shadow-lg"
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onRename?.(project)
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-xs text-copy-secondary",
                  "transition-colors hover:bg-subtle hover:text-copy-primary"
                )}
              >
                <Pencil className="size-3.5" />
                Rename
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  onDelete?.(project)
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-xs text-error",
                  "transition-colors hover:bg-subtle"
                )}
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Sidebar                                                                   */
/* -------------------------------------------------------------------------- */

export function ProjectSidebar({
  isOpen,
  onClose,
  ownedProjects,
  sharedProjects,
  onNewProject,
  onRenameProject,
  onDeleteProject,
}: ProjectSidebarProps) {
  return (
    <>
      {/* Backdrop — click to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed top-14 left-0 bottom-0 z-30 flex w-72 flex-col",
          "bg-surface border-r border-border",
          "transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-medium text-copy-primary">Projects</h2>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-xl",
              "text-copy-muted transition-colors",
              "hover:bg-subtle hover:text-copy-primary"
            )}
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="my-projects" className="flex flex-1 flex-col">
          <div className="px-4">
            <TabsList className="w-full">
              <TabsTrigger value="my-projects">My Projects</TabsTrigger>
              <TabsTrigger value="shared">Shared</TabsTrigger>
            </TabsList>
          </div>

          {/* My Projects tab */}
          <TabsContent value="my-projects" className="flex flex-1 flex-col px-3 py-2 gap-0.5">
            {ownedProjects.length > 0
              ? ownedProjects.map((p) => (
                  <ProjectItem
                    key={p.id}
                    project={p}
                    onRename={onRenameProject}
                    onDelete={onDeleteProject}
                  />
                ))
              : <EmptyState label="My Projects" />}
          </TabsContent>

          {/* Shared tab */}
          <TabsContent value="shared" className="flex flex-1 flex-col px-3 py-2 gap-0.5">
            {sharedProjects.length > 0
              ? sharedProjects.map((p) => (
                  <ProjectItem
                    key={p.id}
                    project={p}
                    onRename={onRenameProject}
                    onDelete={onDeleteProject}
                  />
                ))
              : <EmptyState label="Shared" />}
          </TabsContent>
        </Tabs>

        {/* New Project button */}
        <div className="border-t border-border p-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={onNewProject}
          >
            <Plus className="size-4" />
            New Project
          </Button>
        </div>
      </aside>
    </>
  )
}
