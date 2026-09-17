# API routes

## Overview

Every authenticated HTTP boundary lives here: project CRUD, collaborator management, canvas snapshot persistence, the Liveblocks auth handshake, and the two step AI run endpoints. A handler validates its input, checks access, and hands anything long to a Trigger.dev task.

## Key files

| File | Owns |
| --- | --- |
| `app/api/projects/route.ts` | List and create the caller's projects |
| `app/api/projects/[projectId]/route.ts` | Patch and delete one project |
| `app/api/projects/[projectId]/collaborators/route.ts` | List, add, and remove collaborators |
| `app/api/projects/[projectId]/canvas/route.ts` | Put a canvas snapshot into Vercel Blob, read it back |
| `app/api/projects/[projectId]/specs/route.ts` | List a project's spec metadata |
| `app/api/projects/[projectId]/specs/[specId]/download/route.ts` | Stream one spec as Markdown |
| `app/api/liveblocks-auth/route.ts` | Issue a Liveblocks session token after an access check |
| `app/api/ai/design/route.ts` | Start a design run, return the run id |
| `app/api/ai/design/token/route.ts` | Mint a run scoped token for the submitter |
| `app/api/ai/spec/route.ts` | Start a spec run from the room's own canvas and chat |
| `app/api/ai/spec/token/route.ts` | Mint a run scoped token for the submitter |

## Conventions

- The order is fixed: authenticate with Clerk, parse the body, check project access, then act. Nothing mutates before access is confirmed.
- `roomId` is the project id everywhere in this app. Resolve the project from the room and never read a client supplied `projectId`.
- Errors are `NextResponse.json({ error: "..." }, { status })`. Statuses in use: 201 created, 400 invalid input, 401 unauthenticated, 403 no access, 404 missing.
- Validate with the Zod schemas in `types/tasks.ts` where one exists, otherwise parse into a small local `interface` and narrow by hand.
- Keep handlers thin. Durable work is started through `tasks.trigger` and recorded as a `TaskRun` row.
- Run scoped tokens come from `issueRunTokenForOwner` in `lib/run-token.ts`. Never mint a broad token for a client.
- Route files use semicolons, unlike `src/`, `lib/`, `types/`, and `hooks/`.
- Add `export const dynamic = "force-dynamic"` to routes that read auth or the database.

## Gotchas

- Route params are async in this Next.js version: `const { projectId } = await params`.
- Every client read of a canvas or a spec goes through these routes. A Vercel Blob URL never reaches the browser, so the download route is the single authorized read path for a spec.
- The canvas route stores a private blob and keeps only its URL on `Project.canvasJsonPath`.
- The `RoomId` passed by a client may be any string. Access fails before it is used as a project id.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
