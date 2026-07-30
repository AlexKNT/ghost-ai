# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 2: Canvas & Collaboration — Real-time canvas, node editing, presence, autosave

## Current Goal

- Complete canvas ergonomics (feature 17), then proceed through starter templates, presence, AI sidebar, and AI integration. All foundation features (auth, projects, canvas, shapes, edges, autosave) are in place.

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
- 16-edge-behavior — Custom `CanvasEdge` with smooth-step routing, dim/bright states, 20px invisible click area, inline label editing via `EdgeLabelRenderer` (double-click to edit, pill badge display, faint placeholder when empty), arrow markers, registered as `canvasEdge` type
- 21-canvas-autosave — Canvas save/load API routes (Vercel Blob), autosave hook, Save button in workspace navbar

## In Progress

- None.

## Next Up

- 17-canvas-ergonomics — Canvas pan/zoom ergonomics, keyboard shortcuts, and viewport controls
- 18-starter-templates — Prebuilt system design templates that users can import
- 19-presence-avatars-cursors — Live avatars, presence indicators, and collaborative cursors
- 20-ai-sidebar-shell — Slide-over AI sidebar with tab navigation
- 22-design-agent-api — AI design generation API route and Trigger.dev task
- 23-design-agent-logic — AI generation logic: prompt → structured canvas updates

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Add decisions that affect the system design or data model.

## Session Notes

- 2026-07-30 (feature 16): Implemented custom edge renderer and inline label editing. Created `CanvasEdge` component using `getSmoothStepPath` for clean right-angle routing, `BaseEdge` for rendering (visible path + invisible 20px-wide click area), and `EdgeLabelRenderer` for label positioning at path midpoint. Labels: double-click to edit, pill badge display when saved, faint "Edge label" placeholder when empty, commit on blur/Enter, cancel on Escape. Edges dim at rest (35% opacity) and brighten on selection (85%). Registered as `canvasEdge` type in `canvas-wrapper.tsx` with `defaultEdgeOptions.type`. Arrow markers preserved. `onPointerDown` stops propagation on label to prevent canvas interactions. Build passes.
- 2026-07-30 (feature 15): Implemented floating node color toolbar. Created `NodeColorToolbar` component — appears above selected nodes, shows 8 circular swatches from `NODE_COLORS`. Active swatch gets a colored border + subtle glow matching its text color. Hover scales swatch to 110%. Clicks call `updateNodeData` to sync through Liveblocks. `onPointerDown` stops propagation to prevent canvas drag. Integrated into `canvas-node.tsx` conditional on `selected`. Build passes.
- 2026-07-30 (feature 14): Added resize handles and inline label editing to canvas nodes. `NodeResizer` from `@xyflow/react` provides corner handles on selected nodes with min dimensions 80×60 and subtle white/dark styling. Double-clicking a node label enters inline edit mode with a centered `<textarea>`, commits on blur, cancels on Escape. `updateNodeData` syncs label changes through Liveblocks. `onPointerDown` on the textarea stops propagation to prevent canvas drag/pan during editing. Empty labels show a "Label" placeholder. Build passes.
- 2026-07-30 (feature 13): Added drag ghost preview for shape panel. When dragging a shape from the panel, a scaled canvas-drawn preview of the actual shape (not the icon) now follows the cursor via `setDragImage`. All 6 shapes are rendered on an offscreen canvas using Canvas 2D API matching the node renderer shapes. Cleaned up `ShapeDragPayload` — removed unused `offsetX`/`offsetY` fields. Build passes.
- 2026-07-30 (feature 12): Verified feature 12-shape-panel implementation — all requirements met. Fixed `useShapeDrop.ts` to use the exported `SHAPE_DRAG_DATA_FORMAT` constant instead of hardcoded string literal. Updated progress tracker: Phase → Phase 2 (Canvas & Collaboration), populated Next Up with upcoming features 17-23. Build passes cleanly.
- 2026-07-26: Refactored `canvas-wrapper.tsx` to properly integrate Liveblocks real-time collaboration. Replaced local `useNodesState`/`useEdgesState` with `useLiveblocksFlow` from `@liveblocks/react-flow`. Added `LiveblocksProvider` → `RoomProvider` → `ErrorBoundary` → `ClientSideSuspense` → `ReactFlowProvider` hierarchy. Added `<Cursors />` for presence. Drag-and-drop node creation now uses `onNodesChange([{ type: "add", item: node }])`. Removed custom keyboard delete handler (React Flow handles deletion natively through `useLiveblocksFlow`). Removed custom `onConnect` wrapper (styling via `defaultEdgeOptions`). Installed `@liveblocks/react-flow` and `react-error-boundary`. Build passes.
