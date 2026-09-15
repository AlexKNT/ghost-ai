import { describe, expect, it } from "vitest"

import {
  formatSpecDate,
  parseSpecList,
  specFileUrl,
  specListUrl,
} from "@/hooks/useProjectSpecs"

/* -------------------------------------------------------------------------- */
/*  URLs                                                                      */
/* -------------------------------------------------------------------------- */

describe("spec urls", () => {
  it("addresses a project's spec list", () => {
    expect(specListUrl("proj_1")).toBe("/api/projects/proj_1/specs")
  })

  it("addresses one spec's content through the download route", () => {
    expect(specFileUrl("proj_1", "spec_1")).toBe(
      "/api/projects/proj_1/specs/spec_1/download",
    )
  })

  it("encodes ids so they cannot escape the path", () => {
    expect(specListUrl("a/b")).toBe("/api/projects/a%2Fb/specs")
    expect(specFileUrl("proj_1", "../canvas")).toBe(
      "/api/projects/proj_1/specs/..%2Fcanvas/download",
    )
  })
})

/* -------------------------------------------------------------------------- */
/*  List payload                                                              */
/* -------------------------------------------------------------------------- */

describe("parseSpecList", () => {
  const entry = {
    id: "spec_1",
    filename: "payments-spec-2026-09-15.md",
    createdAt: "2026-09-15T10:39:00.000Z",
  }

  it("keeps the fields the list renders", () => {
    expect(parseSpecList([entry])).toEqual([entry])
  })

  it("drops entries that are missing anything it needs", () => {
    const payload = [
      entry,
      null,
      "spec_2",
      { id: "spec_3" },
      { id: "spec_4", filename: "x.md" },
      { id: 5, filename: "x.md", createdAt: entry.createdAt },
      { ...entry, id: "spec_6" },
    ]

    expect(parseSpecList(payload)).toEqual([entry, { ...entry, id: "spec_6" }])
  })

  it("treats any non-array payload as an empty list", () => {
    expect(parseSpecList(null)).toEqual([])
    expect(parseSpecList({ specs: [entry] })).toEqual([])
    expect(parseSpecList("nope")).toEqual([])
  })
})

/* -------------------------------------------------------------------------- */
/*  Date formatting                                                           */
/* -------------------------------------------------------------------------- */

describe("formatSpecDate", () => {
  it("renders a readable local timestamp", () => {
    const formatted = formatSpecDate("2026-09-15T10:39:00.000Z")

    expect(formatted).toContain("2026")
    expect(formatted).not.toBe("2026-09-15T10:39:00.000Z")
  })

  it("falls back to the raw value when the date is unusable", () => {
    expect(formatSpecDate("not-a-date")).toBe("not-a-date")
  })
})
