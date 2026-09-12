"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
  type Node,
  type Edge,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import "@liveblocks/react-flow/styles.css"

import {
  ClientSideSuspense,
  useUpdateMyPresence,
} from "@liveblocks/react"
import { ErrorBoundary } from "react-error-boundary"
import { useLiveblocksFlow, Cursors } from "@liveblocks/react-flow"

import { useShapeDrop } from "@/hooks/useShapeDrop"
import { useCanvasAutosave, type SaveStatus } from "@/hooks/useCanvasAutosave"
import { CanvasNode } from "@/components/editor/canvas-node"
import { CanvasEdge } from "@/components/editor/canvas-edge"
import { ShapePanel } from "@/components/editor/shape-panel"
import { CanvasControls } from "@/components/editor/canvas-controls"
import { PresenceAvatars } from "@/components/editor/presence-avatars"
import { ThinkingCursor } from "@/components/editor/thinking-cursor"
import { DEFAULT_NODE_COLOR } from "@/types/canvas"
import type { CanvasTemplate } from "@/components/editor/starter-templates"

/* -------------------------------------------------------------------------- */
/*  Node/Edge types                                                           */
/* -------------------------------------------------------------------------- */

const nodeTypes = { canvasNode: CanvasNode }
const edgeTypes = { canvasEdge: CanvasEdge }

// Stable identity so `<Cursors />` never re-mounts the cursor components.
const cursorComponents = { Cursor: ThinkingCursor }

/* -------------------------------------------------------------------------- */
/*  Fallback components                                                       */
/* -------------------------------------------------------------------------- */

function CanvasLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#080809]">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-brand" />
    </div>
  )
}

function CanvasError() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#080809]">
      <div className="text-center">
        <p className="text-lg font-semibold text-copy-primary">
          Connection lost
        </p>
        <p className="mt-2 text-sm text-copy-secondary">
          Unable to connect to the collaboration server. Please refresh the
          page.
        </p>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Inner canvas (needs Liveblocks + ReactFlow context)                       */
/* -------------------------------------------------------------------------- */

interface CanvasInnerProps {
  projectId: string
  onSaveStatusChange: (status: SaveStatus) => void
  saveTriggerRef: React.MutableRefObject<(() => void) | null>
  importTemplateRef: React.MutableRefObject<((template: CanvasTemplate) => void) | null>
}

function CanvasInner({
  projectId,
  onSaveStatusChange,
  saveTriggerRef,
  importTemplateRef,
}: CanvasInnerProps) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<Node, Edge>({
      suspense: true,
      nodes: { initial: [] },
      edges: { initial: [] },
    })

  const { screenToFlowPosition, fitView } = useReactFlow()
  const { onDragStart, createNodeFromDrop } = useShapeDrop()
  const updateMyPresence = useUpdateMyPresence()
  const containerRef = useRef<HTMLDivElement>(null)

  /* ---- saved canvas hydration -------------------------------------------- */

  // Whether the room already held nodes/edges when the canvas first mounted.
  // If so, we skip loading the saved snapshot to avoid overwriting live work.
  const [roomHadContentOnMount] = useState(
    () => nodes.length > 0 || edges.length > 0,
  )

  // Autosave stays disabled until the initial load attempt settles so an empty
  // mount can never clobber an existing saved snapshot.
  const [hydrated, setHydrated] = useState(roomHadContentOnMount)

  // Keep the latest change handlers available without re-running the load effect.
  const handlersRef = useRef({ onNodesChange, onEdgesChange })
  useEffect(() => {
    handlersRef.current = { onNodesChange, onEdgesChange }
  })

  useEffect(() => {
    // Active collaboration in the room — saved state must not overwrite it.
    if (roomHadContentOnMount) return

    let cancelled = false

    const loadSavedCanvas = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/canvas`, {
          cache: "no-store",
        })
        if (!res.ok) return

        const text = await res.text()
        if (!text || text === "null") return

        const parsed = JSON.parse(text) as { nodes?: Node[]; edges?: Edge[] }
        if (cancelled) return

        const savedNodes = Array.isArray(parsed?.nodes) ? parsed.nodes : []
        const savedEdges = Array.isArray(parsed?.edges) ? parsed.edges : []
        if (savedNodes.length === 0 && savedEdges.length === 0) return

        if (savedNodes.length > 0) {
          handlersRef.current.onNodesChange(
            savedNodes.map((node) => ({ type: "add" as const, item: node })),
          )
        }
        if (savedEdges.length > 0) {
          handlersRef.current.onEdgesChange(
            savedEdges.map((edge) => ({ type: "add" as const, item: edge })),
          )
        }

        setTimeout(() => fitView({ duration: 300 }), 100)
      } catch (error) {
        console.error("Failed to load saved canvas:", error)
      } finally {
        if (!cancelled) setHydrated(true)
      }
    }

    void loadSavedCanvas()

    return () => {
      cancelled = true
    }
  }, [projectId, fitView, roomHadContentOnMount])

  /* ---- template import --------------------------------------------------- */

  const importTemplate = useCallback(
    (template: CanvasTemplate) => {
      // Remove all existing nodes and edges
      const nodeRemovals = nodes.map((n) => ({ type: "remove" as const, id: n.id }))
      const edgeRemovals = edges.map((e) => ({ type: "remove" as const, id: e.id }))

      if (edgeRemovals.length > 0) onEdgesChange(edgeRemovals)
      if (nodeRemovals.length > 0) onNodesChange(nodeRemovals)

      // Add template nodes and edges (cast needed: CanvasNodeData → Record<string, unknown>)
      const nodeAdditions = template.nodes.map((n) => ({
        type: "add" as const,
        item: n as unknown as Node,
      }))
      const edgeAdditions = template.edges.map((e) => ({
        type: "add" as const,
        item: e as unknown as Edge,
      }))

      if (nodeAdditions.length > 0) onNodesChange(nodeAdditions)
      if (edgeAdditions.length > 0) onEdgesChange(edgeAdditions)

      // Fit view after a short delay to let React Flow process the changes
      setTimeout(() => fitView({ duration: 300 }), 100)
    },
    [nodes, edges, onNodesChange, onEdgesChange, fitView],
  )

  // Expose import function to parent via ref
  useEffect(() => {
    importTemplateRef.current = importTemplate
    return () => {
      importTemplateRef.current = null
    }
  }, [importTemplateRef, importTemplate])

  /* ---- autosave ---------------------------------------------------------- */

  const getCanvasJson = useCallback(() => {
    return JSON.stringify({ nodes, edges })
  }, [nodes, edges])

  const { status: saveStatus, save, scheduleSave } = useCanvasAutosave({
    projectId,
    getCanvasJson,
    debounceMs: 3000,
    enabled: hydrated,
  })

  // Expose save function to parent via ref
  const saveRef = useRef(save)
  useEffect(() => {
    saveRef.current = save
  }, [save])
  useEffect(() => {
    saveTriggerRef.current = () => saveRef.current()
    return () => {
      saveTriggerRef.current = null
    }
  }, [saveTriggerRef])

  // Notify parent of save status changes
  useEffect(() => {
    onSaveStatusChange(saveStatus)
  }, [saveStatus, onSaveStatusChange])

  // Schedule autosave only after hydration and only once the canvas actually
  // diverges from the hydrated baseline (prevents redundant/no-op writes).
  const baselineRef = useRef<string | null>(null)
  useEffect(() => {
    if (!hydrated) return

    const json = getCanvasJson()
    if (baselineRef.current === null) {
      baselineRef.current = json
      return
    }
    if (json === baselineRef.current) return

    baselineRef.current = json
    scheduleSave()
  }, [hydrated, getCanvasJson, scheduleSave])

  /* ---- cursor broadcasting ---------------------------------------------- */

  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      updateMyPresence({
        cursor: { x: event.clientX - rect.left, y: event.clientY - rect.top },
      })
    },
    [updateMyPresence],
  )

  const onMouseLeave = useCallback(() => {
    updateMyPresence({ cursor: null })
  }, [updateMyPresence])

  /* ---- drag and drop ----------------------------------------------------- */

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      const node = createNodeFromDrop(event, screenToFlowPosition)
      if (node) {
        // Add node through the onNodesChange handler provided by useLiveblocksFlow
        onNodesChange([{ type: "add", item: node }])
      }
    },
    [createNodeFromDrop, screenToFlowPosition, onNodesChange],
  )

  /* ---- minimap style ----------------------------------------------------- */

  const minimapStyle = useMemo(
    () => ({
      height: 120,
      backgroundColor: "#111114",
      maskImage:
        "linear-gradient(to bottom, transparent 0%, #111114 10%, #111114 90%, transparent 100%)",
    }),
    [],
  )

  /* ---- render ------------------------------------------------------------ */

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        deleteKeyCode={["Delete", "Backspace"]}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        connectionLineStyle={{
          stroke: "#f8fafc",
          strokeWidth: 1.5,
        }}
        defaultEdgeOptions={{
          type: "canvasEdge",
          style: { stroke: "#f8fafc", strokeWidth: 1.5 },
          markerEnd: { type: "arrowclosed", color: "#f8fafc" },
        }}
        className="bg-[#080809]"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#2a2a30"
        />
        <MiniMap
          style={minimapStyle}
          nodeColor={DEFAULT_NODE_COLOR.fill}
          maskColor="rgba(8,8,9,0.7)"
        />
        <Cursors components={cursorComponents} />
      </ReactFlow>

      {/* Presence avatars — top-right corner of canvas */}
      <PresenceAvatars />

      {/* Shape panel — floating over canvas */}
      <ShapePanel onDragStart={onDragStart} />

      {/* Canvas controls — zoom, undo/redo, delete */}
      <CanvasControls />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Canvas wrapper (renders inside the workspace room provider)               */
/* -------------------------------------------------------------------------- */

interface CanvasWrapperProps {
  projectId: string
  onSaveStatusChange?: (status: SaveStatus) => void
  saveTriggerRef?: React.MutableRefObject<(() => void) | null>
  importTemplateRef?: React.MutableRefObject<((template: CanvasTemplate) => void) | null>
}

const noopRef: React.MutableRefObject<(() => void) | null> = { current: null }
const noopImportRef: React.MutableRefObject<((template: CanvasTemplate) => void) | null> = { current: null }

/**
 * Renders the collaborative canvas. The `LiveblocksProvider` / `RoomProvider`
 * pair lives in the workspace shell so the room-scoped AI sidebar shares the
 * same room connection instead of opening a second one.
 */
export function CanvasWrapper({
  projectId,
  onSaveStatusChange,
  saveTriggerRef,
  importTemplateRef,
}: CanvasWrapperProps) {
  return (
    <ErrorBoundary fallback={<CanvasError />}>
      <ClientSideSuspense fallback={<CanvasLoading />}>
        <ReactFlowProvider>
          <CanvasInner
            projectId={projectId}
            onSaveStatusChange={onSaveStatusChange ?? (() => {})}
            saveTriggerRef={saveTriggerRef ?? noopRef}
            importTemplateRef={importTemplateRef ?? noopImportRef}
          />
        </ReactFlowProvider>
      </ClientSideSuspense>
    </ErrorBoundary>
  )
}
