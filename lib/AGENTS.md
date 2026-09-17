# Shared server modules

## Overview

Server only modules that every boundary shares: the Prisma client, project access checks, the Liveblocks node client with its canvas and chat helpers, run scoped token minting, spec storage, and the pure AI planning and prompt logic. Nothing here renders, and nothing here imports React.

## Key files

| File | Owns |
| --- | --- |
| `lib/prisma.ts` | The single Prisma client, built over a `pg` pool and `PrismaPg` |
| `lib/project-access.ts` | `getClerkIdentity` and `checkProjectAccess` |
| `lib/liveblocks.ts` | The lazily created Liveblocks node client |
| `lib/liveblocks-flow.ts` | Canvas snapshot reads and server side canvas writes |
| `lib/liveblocks-agent.ts` | AI presence, status publishing, and chat history reads |
| `lib/run-token.ts` | `issueRunTokenForOwner`, the only place run tokens are minted |
| `lib/spec-storage.ts` | Spec blob paths, filenames, and the upload then insert save |
| `lib/spec-generation.ts` | Pure prompt building and Markdown normalization |
| `lib/design-plan.ts` | Pure normalization of a model's design plan |

## Conventions

- Keep these modules free of React and of `NextResponse`. Route handlers and tasks are the only callers.
- Access is always resolved from the room id. `checkProjectAccess(roomId, identity)` is the gate for every project read and write.
- Files use no semicolons, matching `src/`, `types/`, and `hooks/`.
- Keep pure logic pure so it stays testable without a network, a database, or credentials. `lib/design-plan.ts`, `lib/spec-generation.ts`, and the path helpers in `lib/spec-storage.ts` are covered this way.
- A module that needs a secret builds its client lazily inside a function, so a missing key cannot break the build.

## Gotchas

- Do not add `Storage` to the global Liveblocks interface. It makes `initialStorage` a required prop on `RoomProvider` and breaks the canvas. The design task casts the storage root inside `mutateStorage` instead.
- Types that Liveblocks stores must be `type` aliases, not `interface`. An interface does not satisfy the index signature `LsonObject` requires.
- Canvas writes go through `liveblocks.mutateStorage(roomId, callback)`. Storage document shape and its node and edge fields are owned by `liveblocks.config.ts` and `types/canvas.ts`.
- Presence is set with a time to live between 2 and 3599 seconds. Cursor coordinates are flow coordinates, not screen coordinates.
- The database is a Prisma Postgres instance that scales to zero. The first query after an idle period can fail with a connection error, which surfaces as a 500 on `/editor` and succeeds on reload. There is no retry logic yet.
- Run scoped tokens expire in one hour and ownership comes from the `TaskRun` row. A run id belonging to somebody else returns `null`, never a token.
- Blob writes are private. `saveProjectSpec` generates the id first and uploads before inserting the row, so a failed upload leaves no orphan record.
- Standalone scripts need `node --env-file=.env --env-file=.env.local --import tsx`, because an in script `dotenv/config` import runs after the module imports.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
