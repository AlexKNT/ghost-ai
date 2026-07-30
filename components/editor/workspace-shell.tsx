"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { WorkspaceNavbar } from "@/components/editor/workspace-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import { CanvasWrapper } from "@/components/editor/canvas-wrapper"
import type { SaveStatus } from "@/hooks/useCanvasAutosave"
import type { CanvasTemplate } from "@/components/editor/starter-templates"

import type { ProjectSummary } from "@/hooks/useProjectActions"

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface WorkspaceShellProps {
  projectId: string
  projectName: string
  isOwner: boolean
  ownedProjects: ProjectSummary[]
  sharedProjects: ProjectSummary[]
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function WorkspaceShell({
  projectId,
  projectName,
  isOwner,
  ownedProjects,
  sharedProjects,
}: WorkspaceShellProps) {
  const router = useRouter()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const saveTriggerRef = useRef<(() => void) | null>(null)
  const importTemplateRef = useRef<((template: CanvasTemplate) => void) | null>(null)

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

  const handleManualSave = useCallback(() => {
    saveTriggerRef.current?.()
  }, [])

  const handleImportTemplate = useCallback((template: CanvasTemplate) => {
    setTemplatesOpen(false)
    importTemplateRef.current?.(template)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-base overflow-hidden">
      <WorkspaceNavbar
        projectName={projectName}
        sidebarOpen={sidebarOpen}
        aiPanelOpen={aiPanelOpen}
        saveStatus={saveStatus}
        onToggleSidebar={toggleSidebar}
        onToggleAiPanel={toggleAiPanel}
        onOpenShare={() => setShareOpen(true)}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onSave={handleManualSave}
      />

      <ShareDialog
        open={shareOpen}
        projectId={projectId}
        isOwner={isOwner}
        onClose={() => setShareOpen(false)}
      />

      <StarterTemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onImport={handleImportTemplate}
      />

      {/* Left sidebar — floats over canvas */}
      <ProjectSidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
        currentRoomId={projectId}
        onSelectProject={handleSelectProject}
      />

      {/* Central canvas — full viewport, sidebars float on top */}
      <main className="flex-1 pt-14">
        <CanvasWrapper
          projectId={projectId}
          onSaveStatusChange={setSaveStatus}
          saveTriggerRef={saveTriggerRef}
          importTemplateRef={importTemplateRef}
        />
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
