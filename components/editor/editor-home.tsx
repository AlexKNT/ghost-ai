"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, FolderOpen } from "lucide-react"

import { cn } from "@/lib/utils"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import {
  CreateProjectDialog,
  RenameProjectDialog,
  DeleteProjectDialog,
} from "@/components/editor/project-dialogs"
import { useProjectActions } from "@/hooks/useProjectActions"

import type { ProjectSummary } from "@/hooks/useProjectActions"

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */

interface EditorHomeProps {
  ownedProjects: ProjectSummary[]
  sharedProjects: ProjectSummary[]
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function EditorHome({ ownedProjects, sharedProjects }: EditorHomeProps) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const actions = useProjectActions()

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  const handleSelectProject = useCallback(
    (id: string) => {
      router.push(`/editor/${id}`)
      closeSidebar()
    },
    [router, closeSidebar],
  )

  /* ---- render ------------------------------------------------------------ */

  return (
    <div className="flex h-screen flex-col bg-base">
      <EditorNavbar sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />

      <ProjectSidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
        onSelectProject={handleSelectProject}
        onNewProject={actions.openCreate}
        onRenameProject={actions.openRename}
        onDeleteProject={actions.openDelete}
      />

      {/* Editor Home — center content */}
      <main className="flex flex-1 items-center justify-center pt-14">
        <div className="flex flex-col items-center gap-4 text-center max-w-md px-6">
          {/* Icon */}
          <div className="flex size-16 items-center justify-center rounded-2xl bg-subtle">
            <FolderOpen className="size-8 text-copy-faint" />
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-semibold text-copy-primary leading-tight">
            Create a project or open an existing one
          </h1>

          {/* Description */}
          <p className="text-sm text-copy-muted">
            Start a new architecture workspace, or choose a project from the sidebar.
          </p>

          {/* New Project button */}
          <button
            type="button"
            onClick={actions.openCreate}
            className={cn(
              "mt-2 inline-flex items-center gap-2 rounded-xl px-5 py-2.5",
              "bg-brand text-base font-medium text-white",
              "transition-all hover:brightness-110 active:scale-[0.98]"
            )}
          >
            <Plus className="size-4" />
            New Project
          </button>
        </div>
      </main>

      {/* Dialogs */}
      <CreateProjectDialog
        open={actions.isOpen("create")}
        name={actions.name}
        slug={actions.slug}
        loading={actions.loading}
        onNameChange={actions.setName}
        onSubmit={actions.createProject}
        onClose={actions.closeDialog}
      />

      <RenameProjectDialog
        open={actions.isOpen("rename")}
        project={actions.target}
        name={actions.name}
        slug={actions.slug}
        loading={actions.loading}
        onNameChange={actions.setName}
        onSubmit={actions.renameProject}
        onClose={actions.closeDialog}
      />

      <DeleteProjectDialog
        open={actions.isOpen("delete")}
        project={actions.target}
        loading={actions.loading}
        onSubmit={actions.deleteProject}
        onClose={actions.closeDialog}
      />
    </div>
  )
}
