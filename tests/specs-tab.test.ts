import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { SpecsTab } from "@/components/editor/specs-tab"
import type { ProjectSpecsResult } from "@/hooks/useProjectSpecs"
import type { SpecRunHandle } from "@/hooks/useSpecRun"

/**
 * The tab is rendered from a stubbed hook result, which is what the list, empty,
 * and error states depend on. Rendering to static markup keeps the check free of
 * a DOM environment while still going through the real components, the real URL
 * builders, and the real date formatting.
 *
 * The content fetch and the preview dialog are not exercised here: the dialog is
 * a portal, which static markup does not render.
 */
const useProjectSpecsMock = vi.hoisted(() => vi.fn())
const useSpecRunMock = vi.hoisted(() => vi.fn())
const useAiStatusFeedMock = vi.hoisted(() => vi.fn())

vi.mock("@/hooks/useProjectSpecs", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/hooks/useProjectSpecs")>()

  return { ...actual, useProjectSpecs: useProjectSpecsMock }
})
vi.mock("@/hooks/useSpecRun", () => ({ useSpecRun: useSpecRunMock }))
vi.mock("@/hooks/useAiStatusFeed", () => ({
  useAiStatusFeed: useAiStatusFeedMock,
}))

function state(overrides: Partial<ProjectSpecsResult> = {}): ProjectSpecsResult {
  return {
    specs: [],
    isLoading: false,
    error: null,
    refresh: () => {},
    loadContent: async () => "",
    ...overrides,
  }
}

function runState(overrides: Partial<SpecRunHandle> = {}): SpecRunHandle {
  return {
    isActive: false,
    error: null,
    startRun: async () => ({ ok: true }),
    ...overrides,
  }
}

// Defaults for the two hooks each test does not care about. `clearMocks` only
// clears calls, so these have to be re-set per test rather than per file.
beforeEach(() => {
  useSpecRunMock.mockReturnValue(runState())
  useAiStatusFeedMock.mockReturnValue({ message: null, isGenerating: false })
})

function render(): string {
  return renderToStaticMarkup(createElement(SpecsTab, { projectId: "proj_1" }))
}

const SPEC = {
  id: "spec_1",
  filename: "payments-spec-2026-09-15.md",
  createdAt: "2026-09-15T10:39:00.000Z",
}

/**
 * The word "disabled" appears in Tailwind variant classes, so the button's state
 * is read from its attributes instead.
 */
const DISABLED_ATTRIBUTE = /(?:disabled=""|aria-disabled="true")/

describe("SpecsTab", () => {
  it("lists each spec with its filename and creation date", () => {
    useProjectSpecsMock.mockReturnValue(state({ specs: [SPEC] }))

    const html = render()

    expect(html).toContain(SPEC.filename)
    expect(html).toContain("2026")
    expect(html).toContain(`dateTime="${SPEC.createdAt}"`)
  })

  it("points the download action at the project's own spec route", () => {
    useProjectSpecsMock.mockReturnValue(state({ specs: [SPEC] }))

    const html = render()

    expect(html).toContain(
      'href="/api/projects/proj_1/specs/spec_1/download"',
    )
    expect(html).toContain("download")
    expect(html).toContain(`aria-label="Download ${SPEC.filename}"`)
  })

  it("shows a loading state before the list arrives", () => {
    useProjectSpecsMock.mockReturnValue(state({ isLoading: true }))

    expect(render()).toContain("Loading specs")
  })

  it("shows the empty state when the project has no specs", () => {
    useProjectSpecsMock.mockReturnValue(state())

    expect(render()).toContain("No specs yet")
  })

  it("surfaces a failed list load", () => {
    useProjectSpecsMock.mockReturnValue(
      state({ error: "Could not load specs." }),
    )

    const html = render()

    expect(html).toContain("Could not load specs.")
    expect(html).toContain('role="alert"')
  })
})

/* -------------------------------------------------------------------------- */
/*  Generate Spec button                                                      */
/* -------------------------------------------------------------------------- */

describe("SpecsTab generate action", () => {
  it("is ready when nothing is running", () => {
    useProjectSpecsMock.mockReturnValue(state({ specs: [SPEC] }))

    const html = render()

    expect(html).toContain("Generate Spec")
    expect(html).not.toMatch(DISABLED_ATTRIBUTE)
  })

  it("reports progress while its own run is in flight", () => {
    useProjectSpecsMock.mockReturnValue(state({ specs: [SPEC] }))
    useSpecRunMock.mockReturnValue(runState({ isActive: true }))

    const html = render()

    expect(html).toContain("Generating spec…")
    expect(html).toContain('aria-busy="true"')
  })

  it("pauses for a run anyone else in the room started", () => {
    useProjectSpecsMock.mockReturnValue(state({ specs: [SPEC] }))
    useAiStatusFeedMock.mockReturnValue({
      message: null,
      isGenerating: true,
    })

    const html = render()

    expect(html).toContain("Ghost AI is busy…")
    expect(html).toMatch(DISABLED_ATTRIBUTE)
  })

  it("shows why a run could not start", () => {
    useProjectSpecsMock.mockReturnValue(state({ specs: [SPEC] }))
    useSpecRunMock.mockReturnValue(
      runState({ error: "The canvas is empty — add components first" }),
    )

    expect(render()).toContain("The canvas is empty")
  })
})
