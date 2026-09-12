import { describe, expect, it } from "vitest"

import { CANVAS_TEMPLATES, type CanvasTemplate } from "@/components/editor/starter-templates"
import {
  NODE_COLORS,
  NODE_SHAPE_TYPES,
  type CanvasEdgeData,
  type CanvasNodeData,
} from "@/types/canvas"

const TEMPLATE_CASES = CANVAS_TEMPLATES.map(
  (template): [string, CanvasTemplate] => [template.id, template],
)
/**
 * Templates are static canvas snapshots loaded straight into the shared room,
 * so they must satisfy the same schema as user-created content.
 */
describe("starter templates", () => {
  it("ships a non-empty library with unique, described entries", () => {
    expect(CANVAS_TEMPLATES.length).toBeGreaterThan(0)

    const ids = CANVAS_TEMPLATES.map((template) => template.id)
    const names = CANVAS_TEMPLATES.map((template) => template.name)

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(names).size).toBe(names.length)

    for (const template of CANVAS_TEMPLATES) {
      expect(template.id).toMatch(/^[a-z0-9-]+$/)
      expect(template.name.trim().length).toBeGreaterThan(0)
      expect(template.description.trim().length).toBeGreaterThan(0)
    }
  })

  it.each(TEMPLATE_CASES)(
    "%s uses unique ids for nodes and edges",
    (_id, template) => {
      const nodeIds = template.nodes.map((node) => node.id)
      const edgeIds = template.edges.map((edge) => edge.id)

      expect(nodeIds.length).toBeGreaterThan(0)
      expect(edgeIds.length).toBeGreaterThan(0)
      expect(new Set(nodeIds).size).toBe(nodeIds.length)
      expect(new Set(edgeIds).size).toBe(edgeIds.length)
    },
  )

  it.each(TEMPLATE_CASES)(
    "%s only uses canvas shapes and palette colors",
    (_id, template) => {
      for (const node of template.nodes) {
        const data = node.data as unknown as CanvasNodeData

        expect(node.type).toBe("canvasNode")
        expect(NODE_SHAPE_TYPES).toContain(data.shape)
        expect(
          NODE_COLORS.some(
            (color) => color.fill === data.color && color.text === data.textColor,
          ),
        ).toBe(true)
        expect(data.label.trim().length).toBeGreaterThan(0)
        expect(Number.isFinite(node.position.x)).toBe(true)
        expect(Number.isFinite(node.position.y)).toBe(true)
        expect(data.width).toBeGreaterThan(0)
        expect(data.height).toBeGreaterThan(0)
      }
    },
  )

  it.each(TEMPLATE_CASES)(
    "%s only connects nodes it defines, without loops or duplicates",
    (_id, template) => {
      const nodeIds = new Set(template.nodes.map((node) => node.id))
      const pairs = new Set<string>()

      for (const edge of template.edges) {
        const data = edge.data as unknown as CanvasEdgeData

        expect(edge.type).toBe("canvasEdge")
        expect(nodeIds.has(edge.source)).toBe(true)
        expect(nodeIds.has(edge.target)).toBe(true)
        expect(edge.source).not.toBe(edge.target)
        expect(typeof data.label).toBe("string")

        const pair = `${edge.source}->${edge.target}`
        expect(pairs.has(pair)).toBe(false)
        pairs.add(pair)
      }
    },
  )
})
