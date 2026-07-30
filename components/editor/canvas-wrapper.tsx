"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
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
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react"
import { ErrorBoundary } from "react-error-boundary"
import { useLiveblocksFlow, Cursors } from "@liveblocks/react-flow"

import { useShapeDrop } from "@/hooks/useShapeDrop"
import { useCanvasAutosave, type SaveStatus } from "@/hooks/useCanvasAutosave"
import { CanvasNode } from "@/components/editor/canvas-node"
import { CanvasEdge } from "@/components/editor/canvas-edge"
import { ShapePanel } from "@/components/editor/shape-panel"
import { CanvasControls } from "@/components/editor/canvas-controls"
import { DEFAULT_NODE_COLOR } from "@/types/canvas"
import type { CanvasTemplate } from "@/components/editor/starter-templates"

/* -------------------------------------------------------------------------- */
/*  Node/Edge types                                                           */
/* -------------------------------------------------------------------------- */

const nodeTypes = { canvasNode: CanvasNode }
const edgeTypes = { canvasEdge: CanvasEdge }

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

  // Schedule autosave when nodes or edges change
  useEffect(() => {
    scheduleSave()
  }, [nodes, edges, scheduleSave])

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
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        onDragOver={onDragOver}
        onDrop={onDrop}
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
        <Cursors />
      </ReactFlow>

      {/* Shape panel — floating over canvas */}
      <ShapePanel onDragStart={onDragStart} />

      {/* Canvas controls — zoom, undo/redo */}
      <CanvasControls />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Canvas wrapper (provides Liveblocks + ReactFlow context)                  */
/* -------------------------------------------------------------------------- */

interface CanvasWrapperProps {
  projectId: string
  onSaveStatusChange?: (status: SaveStatus) => void
  saveTriggerRef?: React.MutableRefObject<(() => void) | null>
  importTemplateRef?: React.MutableRefObject<((template: CanvasTemplate) => void) | null>
}

const noopRef: React.MutableRefObject<(() => void) | null> = { current: null }
const noopImportRef: React.MutableRefObject<((template: CanvasTemplate) => void) | null> = { current: null }

export function CanvasWrapper({
  projectId,
  onSaveStatusChange,
  saveTriggerRef,
  importTemplateRef,
}: CanvasWrapperProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider
        id={projectId}
        initialPresence={{ cursor: null, isThinking: false }}
      >
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
      </RoomProvider>
    </LiveblocksProvider>
  )
}
