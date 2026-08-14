# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 2: Canvas & Collaboration — Real-time canvas, node editing, presence, autosave

## Current Goal

- Complete starter templates (feature 18), then proceed through AI sidebar and AI integration.

## Completed

- 01-design-system — shadcn/ui setup, core components, lucide-react, cn() helper
- 02-editor-chrome — Editor layout shell and navigation
- 03-auth — Authentication and route protection
- 04-project-dialogs — Project dialogs, editor home, sidebar actions, and mobile improvements
- 05-prisma — Prisma schema, data models, and cached client singleton
- 06-project-apis — Project API routes (list, create, rename, delete)
- 07-wire-editor-home — Wired editor home sidebar and dialogs to real project API
- 08-editor-workspace-shell — Workspace shell with server-side access checks, navbar, sidebar, and canvas placeholder
- 09-share-dialog — Share dialog with collaborator management via Clerk
- 10-liveblocks-setup — Liveblocks config, cached node client, auth route with project access verification
- 11-base-canvas — React Flow canvas with Liveblocks-backed real-time sync via `useLiveblocksFlow`, dotted background, minimap, `<Cursors />`, and collaborative-ready foundation
- 12-shape-panel — Floating shape panel with drag-and-drop onto canvas (rectangle, diamond, circle, pill, cylinder, hexagon)
- 13-node-shape — Custom node renderer with all 6 shape types (CSS + SVG), 4 connection handles per node
- 15-node-color-toolbar — Floating color swatch toolbar above selected nodes, updates node background/text from 8 predefined pairs via `updateNodeData`
- 17-nodes-color-toolbar — Duplicate of 15; updated `NodeColorToolbar` to use `bg-elevated` theme token from `globals.css` instead of hardcoded hex
- 16-edge-behavior — Custom `CanvasEdge` with smooth-step routing, dim/bright states, 20px invisible click area, inline label editing via `EdgeLabelRenderer` (double-click to edit, pill badge display, faint placeholder when empty), arrow markers, registered as `canvasEdge` type
- 21-canvas-autosave — Canvas save/load API routes (Vercel Blob), autosave hook, Save button in workspace navbar
- 17.5-canvas-ergonomics — Floating zoom/undo/redo control bar (bottom-left), `useKeyboardShortcuts` hook (+/− zoom, Cmd+Z/Cmd+Shift+Z undo/redo), Liveblocks `useUndo`/`useRedo` wired with disabled states, skips shortcuts while editing text
- 19-presence-avatars-cursors — Presence avatars in canvas top-right (collaborator avatars with Clerk UserButton, divider when collaborators present), live cursor broadcasting via `onMouseMove`/`onMouseLeave` on ReactFlow, `PresenceAvatars` component with avatar stack (max 5 + overflow), fallback initials, ring for dark canvas visibility
- 22-design-agent-api — AI design generation backend wiring: `POST /api/ai/design` (Clerk auth + project access check → `tasks.trigger` → TaskRun record), `POST /api/ai/design/token` (ownership-verified run-scoped Trigger.dev public token), `TaskRun` Prisma model (unique `runId`, compound `userId`+`projectId` index, FK to Project), minimal `designAgentTask` in `src/trigger/design-agent.ts`, installed `@trigger.dev/sdk`, reused existing `trigger.config.ts` (`dirs: ["./src/trigger"]`)

## In Progress

- None.

## Next Up

- 18-starter-templates — Prebuilt system design templates that users can import
- 20-ai-sidebar-shell — Slide-over AI sidebar with tab navigation
- 23-design-agent-logic — AI generation logic: prompt → structured canvas updates

## Open Questions

- `TRIGGER_SECRET_KEY` is not yet set in `.env.local` — required at runtime for `tasks.trigger()` and `auth.createPublicToken()` to authenticate with Trigger.dev.

## Architecture Decisions

- Trigger.dev tasks live in `src/trigger/` (configured by the existing `trigger.config.ts` `dirs: ["./src/trigger"]`). The design task is at `src/trigger/design-agent.ts`, not `trigger/design-agent.ts`.

## Session Notes

- 2026-08-14 (feature 22): Implemented AI design generation backend wiring. Installed `@trigger.dev/sdk@^4.5.11`. Added `TaskRun` Prisma model (`runId` unique, `projectId`, `userId`, `createdAt`, FK to `Project` with cascade, compound index on `userId`+`projectId`) + migration `20260814071527_add_task_run`. Created `app/api/ai/design/route.ts` (Clerk auth → validate prompt/roomId/projectId → `checkProjectAccess` → `tasks.trigger("design-agent", { prompt, roomId })` → create TaskRun → return `{ runId }`) and `app/api/ai/design/token/route.ts` (auth → find TaskRun by runId → verify `userId` ownership → `auth.createPublicToken({ scopes: { read: { runs: [runId] } } })` → return `{ token }`). Created minimal `src/trigger/design-agent.ts` task (logs + echoes payload, no AI logic). Reused the existing `trigger.config.ts` (project ref already set, `dirs: ["./src/trigger"]`) instead of creating a new one; the task lives under `src/trigger` to match that config. Added `trigger:dev` npm script. Build passes; new routes registered as dynamic.
- 2026-07-30 (feature 19): Implemented presence avatars and live cursors. Created `PresenceAvatars` component positioned top-right of canvas — filters Liveblocks others list to exclude current Clerk user, renders collaborator avatar stack (max 5 visible with +N overflow chip), uses profile photos with initials fallback, rings for dark canvas visibility, divider + Clerk UserButton only when collaborators exist. Added cursor broadcasting via `onMouseMove`/`onMouseLeave` on ReactFlow with `useUpdateMyPresence`, tracking viewport-relative position. Updated `liveblocks.config.ts` Presence type: renamed `isThinking` → `thinking` per spec, added global `Liveblocks` interface augmentation for hook type inference. `<Cursors />` from `@liveblocks/react-flow` already renders collaborative cursors from presence. Build passes.
- 2026-07-30 (feature 17.5): Implemented canvas zoom controls and keyboard shortcuts. Created `CanvasControls` component (bottom-left floating bar) with zoom in/out/fit-view buttons + undo/redo buttons wired to Liveblocks `useUndo`/`useRedo`/`useCanUndo`/`useCanRedo`. Created `useKeyboardShortcuts` hook: +/= zoom in, - zoom out, Cmd+Z undo, Cmd+Shift+Z / Cmd+Y redo; skips while typing in inputs/textareas/contentEditable. Zoom animations at 200ms duration. Integrated into `canvas-wrapper.tsx` inside `ReactFlowProvider`. Build passes.
- 2026-07-30 (feature 17 / 16-nodes-color-toolbar): Spec is a duplicate of feature 15. Updated `NodeColorToolbar` background from hardcoded `bg-[#18181c]/95` to theme token `bg-elevated/95` per `globals.css` conventions. All other requirements (swatch rendering, active glow, hover scale, canvas isolation, `updateNodeData` sync) were already in place. Build passes.
- 2026-07-30 (feature 16): Implemented custom edge renderer and inline label editing. Created `CanvasEdge` component using `getSmoothStepPath` for clean right-angle routing, `BaseEdge` for rendering (visible path + invisible 20px-wide click area), and `EdgeLabelRenderer` for label positioning at path midpoint. Labels: double-click to edit, pill badge display when saved, faint "Edge label" placeholder when empty, commit on blur/Enter, cancel on Escape. Edges dim at rest (35% opacity) and brighten on selection (85%). Registered as `canvasEdge` type in `canvas-wrapper.tsx` with `defaultEdgeOptions.type`. Arrow markers preserved. `onPointerDown` stops propagation on label to prevent canvas interactions. Build passes.
- 2026-07-30 (feature 15): Implemented floating node color toolbar. Created `NodeColorToolbar` component — appears above selected nodes, shows 8 circular swatches from `NODE_COLORS`. Active swatch gets a colored border + subtle glow matching its text color. Hover scales swatch to 110%. Clicks call `updateNodeData` to sync through Liveblocks. `onPointerDown` stops propagation to prevent canvas drag. Integrated into `canvas-node.tsx` conditional on `selected`. Build passes.
- 2026-07-30 (feature 14 fix): Fixed node resize so shapes actually resize visually and persist dimensions. The `NodeResizer` was present but only modified React Flow's internal wrapper dimensions — the inner div and shapes used fixed `data.width`/`data.height` that never updated. Added `onResize`/`onResizeStart`/`onResizeEnd` callbacks to `NodeResizer`: live dimensions tracked in local state during drag (via `liveWidth`/`liveHeight` + `isResizingRef` guard), synced to `data` via `updateNodeData` on resize end. Outer div and all 6 shape renderers now use live dimensions for real-time visual feedback. External data changes from Liveblocks still propagate when not actively resizing. Build passes, undo history records resize operations.
- 2026-07-30 (feature 13): Added drag ghost preview for shape panel. When dragging a shape from the panel, a scaled canvas-drawn preview of the actual shape (not the icon) now follows the cursor via `setDragImage`. All 6 shapes are rendered on an offscreen canvas using Canvas 2D API matching the node renderer shapes. Cleaned up `ShapeDragPayload` — removed unused `offsetX`/`offsetY` fields. Build passes.
- 2026-07-30 (feature 12): Verified feature 12-shape-panel implementation — all requirements met. Fixed `useShapeDrop.ts` to use the exported `SHAPE_DRAG_DATA_FORMAT` constant instead of hardcoded string literal. Updated progress tracker: Phase → Phase 2 (Canvas & Collaboration), populated Next Up with upcoming features 17-23. Build passes cleanly.
- 2026-07-26: Refactored `canvas-wrapper.tsx` to properly integrate Liveblocks real-time collaboration. Replaced local `useNodesState`/`useEdgesState` with `useLiveblocksFlow` from `@liveblocks/react-flow`. Added `LiveblocksProvider` → `RoomProvider` → `ErrorBoundary` → `ClientSideSuspense` → `ReactFlowProvider` hierarchy. Added `<Cursors />` for presence. Drag-and-drop node creation now uses `onNodesChange([{ type: "add", item: node }])`. Removed custom keyboard delete handler (React Flow handles deletion natively through `useLiveblocksFlow`). Removed custom `onConnect` wrapper (styling via `defaultEdgeOptions`). Installed `@liveblocks/react-flow` and `react-error-boundary`. Build passes.
