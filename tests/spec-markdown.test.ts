import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { SpecMarkdown } from "@/components/editor/spec-markdown"

/**
 * The preview renders whatever the model wrote, so the renderer is checked
 * against the shapes the spec prompt actually asks for: headings, tables (GFM,
 * which needs the plugin), fenced code, and lists.
 */
function render(content: string): string {
  return renderToStaticMarkup(createElement(SpecMarkdown, { content }))
}

describe("SpecMarkdown", () => {
  it("renders headings and paragraphs", () => {
    const html = render("# Payments Platform\n\nBody text.")

    expect(html).toContain("<h1")
    expect(html).toContain("Payments Platform")
    expect(html).toContain("<p")
    expect(html).toContain("Body text.")
  })

  it("renders GFM tables, which the spec prompt asks for", () => {
    const html = render(
      [
        "## Components",
        "",
        "| Component | Role |",
        "| --------- | ---- |",
        "| Gateway | Routing |",
      ].join("\n"),
    )

    expect(html).toContain("<table")
    expect(html).toContain("<th")
    expect(html).toContain("Component")
    expect(html).toContain("<td")
    expect(html).toContain("Gateway")
  })

  it("renders fenced code inside a block and keeps its language class", () => {
    const html = render(["```json", '{ "id": 1 }', "```"].join("\n"))

    expect(html).toMatch(/<pre[^>]*>\s*<code[^>]*language-json/)
    expect(html).toContain('{ &quot;id&quot;: 1 }')
  })

  it("never leaks react-markdown's hast node into the DOM", () => {
    const html = render("# Title\n\nBody with `code`.\n\n- item")

    expect(html).not.toContain("node=")
    expect(html).not.toContain("[object Object]")
  })

  it("renders lists and links", () => {
    const html = render("- one\n- [two](https://example.com)")

    expect(html).toContain("<ul")
    expect(html).toContain("<li")
    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('rel="noreferrer"')
  })

  it("does not execute raw HTML from the document", () => {
    const html = render('<script>alert("x")</script>')

    expect(html).not.toContain("<script")
  })
})
