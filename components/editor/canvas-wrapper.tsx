"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { useShapeDrop } from "@/hooks/useShapeDrop"
import { useCanvasAutosave, type SaveStatus } from "@/hooks/useCanvasAutosave"
import { CanvasNode } from "@/components/editor/canvas-node"
import { ShapePanel } from "@/components/editor/shape-panel"
import { DEFAULT_NODE_COLOR } from "@/types/canvas"

/* -------------------------------------------------------------------------- */
/*  Node/Edge types                                                           */
/* -------------------------------------------------------------------------- */

const nodeTypes = { canvasNode: CanvasNode }

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function generateEdgeId(): string {
  return `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/* -------------------------------------------------------------------------- */
/*  Inner canvas (needs ReactFlowProvider context)                            */
/* -------------------------------------------------------------------------- */

interface CanvasInnerProps {
  projectId: string
  onSaveStatusChange: (status: SaveStatus) => void
  saveTriggerRef: React.MutableRefObject<(() => void) | null>
}

function CanvasInner({
  projectId,
  onSaveStatusChange,
  saveTriggerRef,
}: CanvasInnerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const { screenToFlowPosition } = useReactFlow()
  const { onDragStart, createNodeFromDrop } = useShapeDrop()

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
  saveRef.current = save
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

  /* ---- connections ------------------------------------------------------- */

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        id: generateEdgeId(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
        type: "default",
        data: { label: "" },
        style: {
          stroke: "#f8fafc",
          strokeWidth: 1.5,
        },
        markerEnd: { type: "arrowclosed", color: "#f8fafc" },
      }
      setEdges((eds) => [...eds, newEdge])
    },
    [setEdges],
  )

  /* ---- drag and drop ----------------------------------------------------- */

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      const node = createNodeFromDrop(event, screenToFlowPosition)
      if (node) {
        setNodes((nds) => [...nds, node])
      }
    },
    [createNodeFromDrop, screenToFlowPosition, setNodes],
  )

  /* ---- keyboard: delete selected nodes & edges --------------------------- */

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Delete" && e.key !== "Backspace") return

      const target = e.target as HTMLElement
      const tag = target.tagName.toLowerCase()
      if (tag === "input" || tag === "textarea" || target.isContentEditable) {
        return
      }

      setNodes((nds) => nds.filter((n) => !n.selected))
      setEdges((eds) => eds.filter((e) => !e.selected))
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [setNodes, setEdges])

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
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={null}
        connectionLineStyle={{
          stroke: "#f8fafc",
          strokeWidth: 1.5,
        }}
        defaultEdgeOptions={{
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
      </ReactFlow>

      {/* Shape panel — floating over canvas */}
      <ShapePanel onDragStart={onDragStart} />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Canvas wrapper (provides ReactFlow context)                               */
/* -------------------------------------------------------------------------- */

interface CanvasWrapperProps {
  projectId: string
  onSaveStatusChange?: (status: SaveStatus) => void
  saveTriggerRef?: React.MutableRefObject<(() => void) | null>
}

const noopRef: React.MutableRefObject<(() => void) | null> = { current: null }

export function CanvasWrapper({
  projectId,
  onSaveStatusChange,
  saveTriggerRef,
}: CanvasWrapperProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner
        projectId={projectId}
        onSaveStatusChange={onSaveStatusChange ?? (() => {})}
        saveTriggerRef={saveTriggerRef ?? noopRef}
      />
    </ReactFlowProvider>
  )
}
