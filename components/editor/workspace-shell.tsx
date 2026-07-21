"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { WorkspaceNavbar } from "@/components/editor/workspace-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"

import type { ProjectSummary } from "@/hooks/useProjectActions"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface WorkspaceShellProps {
  projectId: string
  projectName: string
  ownedProjects: ProjectSummary[]
  sharedProjects: ProjectSummary[]
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function WorkspaceShell({
  projectId,
  projectName,
  ownedProjects,
  sharedProjects,
}: WorkspaceShellProps) {
  const router = useRouter()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const toggleAiPanel = useCallback(() => setAiPanelOpen((prev) => !prev), [])

  const handleSelectProject = useCallback(
    (id: string) => {
      if (id !== projectId) {
        router.push(`/editor/${id}`)
      }
      closeSidebar()
    },
    [projectId, router, closeSidebar],
  )

  return (
    <div className="flex h-screen flex-col bg-base">
      <WorkspaceNavbar
        projectName={projectName}
        sidebarOpen={sidebarOpen}
        aiPanelOpen={aiPanelOpen}
        onToggleSidebar={toggleSidebar}
        onToggleAiPanel={toggleAiPanel}
      />

      <ProjectSidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
        currentRoomId={projectId}
        onSelectProject={handleSelectProject}
      />

      {/* Central canvas placeholder */}
      <main
        className={cn(
          "flex flex-1 items-center justify-center pt-14",
          "bg-[#1a1a2e]",
        )}
      >
        <div className="flex flex-col items-center gap-3 text-center max-w-sm px-6">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-white/5">
            <svg
              className="size-7 text-white/20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"
              />
            </svg>
          </div>
          <p className="text-sm text-white/30">Canvas coming soon</p>
        </div>
      </main>

      {/* AI sidebar placeholder */}
      {aiPanelOpen && (
        <aside
          className={cn(
            "fixed top-14 right-0 bottom-0 z-30 w-80",
            "border-l border-border bg-surface",
          )}
        >
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
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
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                />
              </svg>
            </div>
            <p className="text-sm text-copy-muted text-center">
              AI chat coming soon
            </p>
          </div>
        </aside>
      )}
    </div>
  )
}
