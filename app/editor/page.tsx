"use client"

import { useState, useCallback } from "react"
import { Plus, FolderOpen } from "lucide-react"

import { cn } from "@/lib/utils"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import {
  CreateProjectDialog,
  RenameProjectDialog,
  DeleteProjectDialog,
} from "@/components/editor/project-dialogs"
import { useProjectDialogs } from "@/components/editor/use-project-dialogs"

export default function EditorPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const dialogs = useProjectDialogs()

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  /* ---- dialog submit handlers (mock — no persistence) -------------------- */

  const handleCreateSubmit = useCallback(() => {
    if (dialogs.name.trim().length === 0) return
    dialogs.setLoading(true)
    // Simulate async work
    setTimeout(() => {
      dialogs.setLoading(false)
      dialogs.closeDialog()
    }, 600)
  }, [dialogs])

  const handleRenameSubmit = useCallback(() => {
    if (dialogs.name.trim().length === 0 || !dialogs.target) return
    dialogs.setLoading(true)
    setTimeout(() => {
      dialogs.setLoading(false)
      dialogs.closeDialog()
    }, 600)
  }, [dialogs])

  const handleDeleteSubmit = useCallback(() => {
    if (!dialogs.target) return
    dialogs.setLoading(true)
    setTimeout(() => {
      dialogs.setLoading(false)
      dialogs.closeDialog()
    }, 600)
  }, [dialogs])

  /* ---- render ------------------------------------------------------------ */

  return (
    <div className="flex h-screen flex-col bg-base">
      <EditorNavbar sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />

      <ProjectSidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        onNewProject={dialogs.openCreate}
        onRenameProject={dialogs.openRename}
        onDeleteProject={dialogs.openDelete}
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
            onClick={dialogs.openCreate}
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
        open={dialogs.isOpen("create")}
        name={dialogs.name}
        slug={dialogs.slug}
        loading={dialogs.loading}
        onNameChange={dialogs.setName}
        onSubmit={handleCreateSubmit}
        onClose={dialogs.closeDialog}
      />

      <RenameProjectDialog
        open={dialogs.isOpen("rename")}
        project={dialogs.target}
        name={dialogs.name}
        slug={dialogs.slug}
        loading={dialogs.loading}
        onNameChange={dialogs.setName}
        onSubmit={handleRenameSubmit}
        onClose={dialogs.closeDialog}
      />

      <DeleteProjectDialog
        open={dialogs.isOpen("delete")}
        project={dialogs.target}
        loading={dialogs.loading}
        onSubmit={handleDeleteSubmit}
        onClose={dialogs.closeDialog}
      />
    </div>
  )
}
