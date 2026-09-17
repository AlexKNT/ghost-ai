# Architecture Context

## Stack

| Layer            | Technology              | Role                                                           |
| ---------------- | ----------------------- | -------------------------------------------------------------- |
| Framework        | Next.js 16 + TypeScript | Full-stack app with server/client boundaries                   |
| UI               | Tailwind + shadcn/ui    | Component composition and styling                              |
| Auth             | Clerk                   | User identity and route protection                             |
| Database         | Prisma + PostgreSQL     | Relational metadata: projects, collaborators, specs, task runs |
| Canvas           | Liveblocks + React Flow | Real-time collaborative canvas, presence, and cursors          |
| Background tasks | Trigger.dev             | Durable AI generation workflows                                |
| Artifact storage | Vercel Blob             | Canvas snapshots and generated Markdown specs                  |

## System Boundaries

- `app/api` — Authenticated request handlers: input validation, ownership checks, task triggering, and persistence.
- `src/trigger` — Long-running background jobs: AI design generation and spec generation.
- `lib` — Shared infrastructure: Prisma client, access control helpers, and utilities.
- `components` — UI composition: canvas surfaces, sidebars, dialogs, and interactive elements.
- `prisma` — Database schema and migrations, split one file per model. The generated client is output to `app/generated/prisma`.

## Storage Model

- **Database**: metadata, ownership, relationships, and task run records.
- **Vercel Blob**: generated artifacts — canvas snapshots at `canvas/{projectId}.json` and specs at `specs/{projectId}/{specId}.md`.
- Project records, spec records, and task run records belong in PostgreSQL.
- Canvas content and Markdown output are stored in and retrieved from Vercel Blob.
- The blob URL is stored in the database (`canvasJsonPath`, `filePath`) as the reference to the artifact.

## Auth and Collaboration Model

- Every project has a single owner (Clerk user ID).
- Projects can include additional collaborators.
- Only authenticated users can access protected routes.
- Only the owner or a collaborator can mutate project resources.
- Liveblocks room tokens are issued only after verifying project membership.

## Starter System Designs

- Prebuilt templates are static canvas snapshots stored in the codebase.
- Templates are loaded into the active Liveblocks room when a user imports one.
- Import can occur on canvas creation or from within the editor at any time.
- Template data follows the same node/edge schema as user-created canvas content.
- Templates do not require a separate database record; they are resolved by template ID at import time.

## AI Generation Model

### Design Generation

- Input: user prompt, project context, and current canvas state.
- Execution: durable background task via Trigger.dev. The task reads the canvas through the Liveblocks node client and writes its change set with `liveblocks.mutateStorage`, mutating the same storage document `useLiveblocksFlow` owns — no parallel canvas state.
- Output: structured node and edge updates written into the shared Liveblocks room.
- Visibility: the agent publishes progress to the room-scoped `ai-status-feed` Liveblocks feed and appears as a participant through ephemeral presence (`thinking` + cursor), so collaborators see it work in real time. The AI sidebar reads the same feed for its status indicator and cursor badges read `thinking` from presence, so every participant sees one shared view of AI activity.
- The model only proposes changes. The task validates them first: shapes and colors are constrained to the canvas palette, geometry is snapped to the canvas grid, and deletes never leave dangling edges.

### Spec Generation

- Input: the room's own canvas graph and conversation. `POST /api/ai/spec` accepts only a room id, resolves access from it, and reads both halves server-side — a spec cannot be generated from content a client chose, and the input cannot be stale.
- Trigger: the editor's Specs tab starts a run. The button reports progress, is paused room-wide while any AI run is active, and any finished run refreshes the list. An empty canvas is refused before a run is spent.
- Execution: durable background task via Trigger.dev (`generate-spec`), using the same Gemini model as the design agent. It writes nothing back to the room and reports progress through the room's `ai-status-feed`, so collaborators see spec generation the same way they see a design run.
- Output: a Markdown technical spec. Before the run reports success the document is uploaded to Vercel Blob at `specs/{projectId}/{specId}.md` and recorded as a `ProjectSpec` row holding that reference; the run also returns the Markdown and the record id.
- Surface: the editor's Specs tab lists a project's specs (metadata only — never the blob reference), previews one as rendered Markdown, and downloads it. Every read goes through the app's own authenticated routes: `GET /api/projects/[projectId]/specs` for metadata and `GET /api/projects/[projectId]/specs/[specId]/download` for the document, so a Blob URL never reaches the client.
- Access: the project is resolved from the room id on the server. A client-supplied project id is never read.

## Invariants

1. Request handlers do not run long-lived AI work — that belongs in background tasks.
2. Metadata and large generated artifacts are stored in separate layers.
3. Auth and ownership are enforced at every mutation boundary.
4. Client components are used only where browser interactivity or real-time state requires them.
5. The canvas schema must remain consistent between user-created content and imported templates.
