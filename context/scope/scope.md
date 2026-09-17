# Scope: Ghost AI

Ghost AI is a real time collaborative system design workspace for engineers. You describe a system in plain English, an AI agent maps it onto a shared canvas, collaborators refine it, and the app turns the graph into a downloadable Markdown specification.

**Build approach:** Tracer Bullet (each feature is built end to end through every layer and works). Read from how the 29 shipped specs were built.
**Workflow:** Beta (after `/develop`, run `/check verify` then `/test`). The project default level of rigor, matching the test suite and the lint gate the repo already keeps. `/architect` is the recommended first stop for a feature with a real decision, but skippable when you already know the build. Any feature can carry its own tag (e.g. `· GA`) to do more or less.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit: if you already know how to build a feature, use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| A | Design system and UI foundation | Shipped | existing |
| B | Authentication and route protection | Shipped | existing |
| C | Projects, ownership, and collaborators | Shipped | existing |
| D | Editor home and project navigation | Shipped | existing |
| E | Collaborative canvas | Shipped | existing |
| F | Canvas editing ergonomics | Shipped | existing |
| G | Canvas persistence and autosave | Shipped | existing |
| H | Presence avatars and live cursors | Shipped | existing |
| I | Starter system designs | Shipped | existing |
| J | AI design generation | Shipped | existing |
| K | Room chat and AI activity feed | Shipped | existing |
| L | Spec generation | Shipped | existing |
| M | Spec storage and download | Shipped | existing |
| N | Specs tab: list, preview, download | Shipped | existing |
| 1 | Deployment and production environment | Ship | planned |
| 2 | Verify the AI generation loops live | Ship | planned |
| 3 | Verify collaboration and private artifacts live | Ship | planned |
| 4 | Accessibility pass | Hardening | planned |
| 5 | Performance budgets | Hardening | planned |

## Shipped

Built before this scope existed. Enrolled for context only.

### A. Design system and UI foundation · existing
Dark only theme tokens, typography, the border radius scale, and the base component set every surface uses. code in `app/globals.css`, `components/ui/`

### B. Authentication and route protection · existing
Clerk sign in and sign up, session handling, and the middleware that gates the app. code in `app/sign-in/`, `app/sign-up/`, `proxy.ts`

### C. Projects, ownership, and collaborators · existing
Create, list, rename, and delete projects, with owner and collaborator access checks and sharing by email. code in `app/api/projects/`, `lib/project-access.ts`, `prisma/models/project.prisma`

### D. Editor home and project navigation · existing
The editor home list of owned and shared projects, its sidebar, and the project dialogs. code in `components/editor/editor-home.tsx`, `project-sidebar.tsx`, `project-dialogs.tsx`

### E. Collaborative canvas · existing
The React Flow surface backed by Liveblocks storage, with six node shapes, labelled edges, a minimap, and a dotted background. code in `components/editor/canvas-wrapper.tsx`, `canvas-node.tsx`, `canvas-edge.tsx`, `liveblocks.config.ts`

### F. Canvas editing ergonomics · existing
The shape panel with drag and drop, the node color toolbar, the zoom and undo controls, and the keyboard shortcuts. code in `components/editor/shape-panel.tsx`, `node-color-toolbar.tsx`, `canvas-controls.tsx`, `hooks/useKeyboardShortcuts.ts`

### G. Canvas persistence and autosave · existing
Debounced autosave of the canvas to a private blob, with only the URL kept on the project row, plus hydration of a saved canvas into an empty room. code in `hooks/useCanvasAutosave.ts`, `app/api/projects/[projectId]/canvas/route.ts`

### H. Presence avatars and live cursors · existing
Collaborator avatars in the canvas corner and live cursors, including the agent's thinking cursor. code in `components/editor/presence-avatars.tsx`, `thinking-cursor.tsx`

### I. Starter system designs · existing
A template library with lightweight previews, imported into the active room and replaced in place. code in `components/editor/starter-templates.ts`, `starter-templates-modal.tsx`

### J. AI design generation · existing
A prompt becomes nodes and edges in the shared room through a durable task that validates the model's plan against the palette, the shapes, and the grid. code in `src/trigger/design-agent.ts`, `lib/design-plan.ts`, `app/api/ai/design/`

### K. Room chat and AI activity feed · existing
The AI Architect tab's shared conversation over one room feed, and the run status chip over a second feed that every participant reads. code in `hooks/useAiChatFeed.ts`, `hooks/useAiStatusFeed.ts`, `types/tasks.ts`

### L. Spec generation · existing
The room's own canvas and conversation become a Markdown technical specification through a durable task, which publishes progress to the room as it works. code in `src/trigger/generate-spec.ts`, `lib/spec-generation.ts`, `app/api/ai/spec/`

### M. Spec storage and download · existing
A generated spec is uploaded to a private blob and recorded as a project spec before the run reports success, and downloads stream it back as an attachment. code in `lib/spec-storage.ts`, `app/api/projects/[projectId]/specs/`

### N. Specs tab: list, preview, download · existing
The Specs tab lists a project's specs with dates, previews one as rendered Markdown, and downloads it. code in `components/editor/specs-tab.tsx`, `spec-preview-dialog.tsx`, `hooks/useProjectSpecs.ts`

## Ship

### 1. Deployment and production environment · needs a decision
The app has only ever run on a dev machine, so the one layer that has never been exercised is production. Retire it before widening anything else (basis: the deploy layer is part of the walking skeleton). Choose where it runs, set the production environment, and add the variables the durable tasks read to the task dashboard so runs work outside a local file.
**Done when:** the app answers on a production URL, a signed in user can open a project and edit the canvas, and a triggered AI run completes on the dashboard environment rather than a local file.
- [ ] Design it (spec): `/architect deployment and production environment`

### 2. Verify the AI generation loops live
Both AI loops are wired and unit tested, but no run has left a signed in browser. Prove the prompt to canvas path and the canvas to spec path for real, then prove them again on production.
**Done when:** a prompt puts nodes in the room for every participant while the status chip advances and the summary lands in the chat, and a spec run lists, previews, and downloads without a reload. Repeated on the production URL.
- [ ] Verify the live design and spec round trips: `/check verify ai generation`

### 3. Verify collaboration and private artifacts live
The collaborative paths are covered by tests and the feeds were exercised against the live API, but two browser flows have never been observed: two participants in one room, and a real file download.
**Done when:** two signed in browsers in one project see each other's cursors, messages, and node edits live; a saved canvas reloads into an empty room; and a spec downloads as Markdown with the right filename while another user's spec id is refused.
- [ ] Verify the collaboration and artifact paths: `/check verify collaboration and artifacts`

## Hardening

### 4. Accessibility pass · needs a decision
The canvas, the sidebars, and the dialogs have never been measured against an accessibility standard, and the keyboard layer currently only knows how to skip text editing. Pick a target and hold the app to it (basis: a conformance level is a decision the engineer has not made).
**Done when:** every interactive surface is reachable and operable by keyboard with a visible focus state, dialogs trap focus and restore it on close, the canvas has a usable non visual path, and the chosen standard's automated checks pass.
- [ ] Design it (spec): `/architect accessibility pass`

### 5. Performance budgets · needs a decision
A large graph is the realistic worst case for this app, and there is no target and no way to measure one today. Decide what fast enough means and where it is measured (basis: absence of a stated target is the decision owed).
**Done when:** a stated budget covers canvas interaction on a large graph, spec list load, and the time to first node for a design run, each with a repeatable way to measure it.
- [ ] Design it (spec): `/architect performance budgets`

## Deferred

Out of scope for this pass, kept so the plan stays honest.

- **Billing and plans**: paid tiers for the workspace · needs a decision
- **Error monitoring**: one place to see runtime errors, failed runs, and crashed tasks · needs a decision · declined for this pass
- **Internationalization**: more languages, plus locale aware dates instead of the runtime default
- **Public marketing site**: a page for people who have not signed up, with the metadata and social cards that go with it
- **Mobile app**: a native client
- **Spec history and review**: versioned specs and approval flows

## Legend

**The decision box.** Every feature carries exactly one, the sub task whose label ends with `(spec)`. Its wording varies, so skills locate it by that `(spec)` suffix, never by an exact label. Every other box is an execution box and `/architect` never ticks one.

**Feature lifecycle**: the scope updates as a feature moves, and each row is what it shows and who sets it:

| State | Set by | The feature shows |
|---|---|---|
| `planned` · needs a decision | `/scope` | one box: `Design it (spec): /architect <feature>` |
| `in-progress` (designed) | `/architect` at spec capture | `Design it` ticked; spec linked; `Build it: /develop <feature>` with 2 to 5 milestones; the tier's closing boxes (`Verify it` at Alpha and above, `Test it` at Beta and above) |
| `in-progress` (building) | `/develop` | milestone sub boxes tick one by one; code pointer filled |
| `in-progress` (verified) | `/check verify` | `Build it` and its milestones ticked; `Verify it` ticked |
| `done` | you, when you decide it is | boxes you ran ticked, skipped ones marked skipped; at Beta the last stage is `/test` |

- **Next step** = the first unticked box, always a command or a tracked milestone.
- **needs a decision** = run `/architect` first, otherwise straight to `/develop`. The tag drops once the spec is captured.
- **Atomic build tasks live in the spec's build plan, not here.** The scope carries only the milestone rollup.
- **Status** runs `planned` to `in-progress` to `done`, plus `existing` (built before this scope) and `dropped` (removed, kept for history). `/develop` and `/sync` leave `existing` rows alone.
- **Workflow tier** decides what runs after `/develop`: **Prototype** is nothing, **Alpha** adds `/check verify`, **Beta** adds `/check verify` then `/test`, **GA** adds a fresh model `/check review` and `/document`. A tag beside a heading overrides the project default for that feature.
- **Pointer line** (`spec <n> · code in <path>`): the scope link is added by `/architect` at capture, the code path by `/develop`.

## References

### Project sources
- `context/progress-tracker.md`: the state of every shipped feature above, and the source for each unverified path named in features 2 and 3.
- `context/architecture-context.md`: the boundaries and the five invariants the shipped rows follow.
- `context/feature-specs/`: the 29 numbered specs behind the shipped rows.
- `context/ai-workflow-rules.md`: the spec driven incremental workflow that the Tracer Bullet approach matches.

### Practices & standards
- **Foundations before features**, the reason the shipped rows are enrolled before anything new is planned.
- **Vertical slices ship real value early**, the reason each shipped feature landed whole rather than layer by layer.
- **The deploy layer belongs in the first real thread**, the reason feature 1 comes before features 4 and 5.
- **A data model is the costliest thing to redo**, the reason the shipped model is enrolled and left alone.

### Links
- [The Pragmatic Programmer, 20th Anniversary Edition](https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/): the book whose Tracer Bullets chapter the approach name comes from.
- [Growing Object-Oriented Software Guided by Tests](https://www.growing-object-oriented-software.com/): the book that names the walking skeleton.
- [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/): the W3C Recommendation with conformance levels A, AA, and AAA, the standard feature 4 must be measured against.
- [Web Vitals](https://web.dev/articles/vitals): Google's published Core Web Vitals and their thresholds, the starting point for feature 5.
- [Next.js: Deploying](https://nextjs.org/docs/app/getting-started/deploying): the official guide to deployment targets and build output for the framework already in use.

No verified link for the Trigger.dev deployment guide (the documentation URL checked returned a 404), so the dashboard variable requirement in feature 1 rests on `context/progress-tracker.md` alone.
