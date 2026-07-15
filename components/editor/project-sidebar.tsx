"use client"

import { Plus, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  onNewProject?: () => void
}

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

export function ProjectSidebar({
  isOpen,
  onClose,
  onNewProject,
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
          <TabsContent value="my-projects" className="flex flex-1 flex-col">
            <EmptyState label="My Projects" />
          </TabsContent>

          {/* Shared tab */}
          <TabsContent value="shared" className="flex flex-1 flex-col">
            <EmptyState label="Shared" />
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
