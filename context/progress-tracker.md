# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Phase 1: Foundation — Design System & UI Primitives

## Current Goal

- Build project dialogs (create, rename, delete), editor home screen, and sidebar project actions with mock data.

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
- 15-node-color-toolbar — (skip for now, uses default color palette)
- 16-edge-behavior — Connection handles on all 4 sides, edge creation with arrow markers
- 21-canvas-autosave — Canvas save/load API routes (Vercel Blob), autosave hook, Save button in workspace navbar

## In Progress

- None yet.

## Next Up

- (none — see feature specs for upcoming work)

## Open Questions

- Add unresolved product or implementation questions here.

## Architecture Decisions

- Add decisions that affect the system design or data model.

## Session Notes

- 2026-07-26: Refactored `canvas-wrapper.tsx` to properly integrate Liveblocks real-time collaboration. Replaced local `useNodesState`/`useEdgesState` with `useLiveblocksFlow` from `@liveblocks/react-flow`. Added `LiveblocksProvider` → `RoomProvider` → `ErrorBoundary` → `ClientSideSuspense` → `ReactFlowProvider` hierarchy. Added `<Cursors />` for presence. Drag-and-drop node creation now uses `onNodesChange([{ type: "add", item: node }])`. Removed custom keyboard delete handler (React Flow handles deletion natively through `useLiveblocksFlow`). Removed custom `onConnect` wrapper (styling via `defaultEdgeOptions`). Installed `@liveblocks/react-flow` and `react-error-boundary`. Build passes.
