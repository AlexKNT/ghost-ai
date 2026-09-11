"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

import { WorkspaceNavbar } from "@/components/editor/workspace-navbar"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import { CanvasWrapper } from "@/components/editor/canvas-wrapper"
import { AISidebar } from "@/components/editor/ai-sidebar"
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
  const closeAiPanel = useCallback(() => setAiPanelOpen(false), [])

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

      {/* AI sidebar — floats over canvas */}
      <AISidebar isOpen={aiPanelOpen} onClose={closeAiPanel} />
    </div>
  )
}
