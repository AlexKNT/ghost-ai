import { describe, expect, it } from "vitest"

import {
  DEFAULT_NODE_COLOR,
  NODE_COLORS,
  NODE_COLOR_NAMES,
  NODE_SHAPES,
  NODE_SHAPE_TYPES,
  SHAPE_DRAG_DATA_FORMAT,
  getNodeColor,
  getNodeColorName,
  getNodeShape,
  type NodeShape,
} from "@/types/canvas"

/* -------------------------------------------------------------------------- */
/*  Palette                                                                   */
/* -------------------------------------------------------------------------- */

describe("node color palette", () => {
  it("has exactly one swatch per named color, in order", () => {
    expect(NODE_COLORS.map((color) => color.name)).toEqual([
      ...NODE_COLOR_NAMES,
    ])
  })

  it("has 8 unique fills and 8 unique text colors", () => {
    expect(NODE_COLORS).toHaveLength(8)
    expect(new Set(NODE_COLORS.map((color) => color.fill)).size).toBe(8)
    expect(new Set(NODE_COLORS.map((color) => color.text)).size).toBe(8)
  })

  it("uses hex values for every swatch", () => {
    for (const color of NODE_COLORS) {
      expect(color.fill).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(color.text).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })

  it("resolves each palette name to its own swatch", () => {
    for (const color of NODE_COLORS) {
      expect(getNodeColor(color.name)).toBe(color)
    }
  })

  it("falls back to the neutral default for unknown or missing names", () => {
    expect(DEFAULT_NODE_COLOR.name).toBe("neutral")
    expect(DEFAULT_NODE_COLOR).toBe(NODE_COLORS[0])
    expect(getNodeColor("chartreuse")).toBe(DEFAULT_NODE_COLOR)
    expect(getNodeColor(undefined)).toBe(DEFAULT_NODE_COLOR)
  })

  it("resolves a stored fill or a palette name to the palette name", () => {
    for (const color of NODE_COLORS) {
      expect(getNodeColorName(color.fill)).toBe(color.name)
      expect(getNodeColorName(color.name)).toBe(color.name)
    }
  })

  it("normalizes case and whitespace, and defaults the rest", () => {
    expect(getNodeColorName("  #10233D ")).toBe("blue")
    expect(getNodeColorName("PURPLE")).toBe("purple")
    expect(getNodeColorName("#123456")).toBe(DEFAULT_NODE_COLOR.name)
    expect(getNodeColorName(undefined)).toBe(DEFAULT_NODE_COLOR.name)
    expect(getNodeColorName("")).toBe(DEFAULT_NODE_COLOR.name)
  })
})

/* -------------------------------------------------------------------------- */
/*  Shapes                                                                    */
/* -------------------------------------------------------------------------- */

describe("node shapes", () => {
  it("has exactly one definition per shape type, in order", () => {
    expect(NODE_SHAPES.map((shape) => shape.type)).toEqual([
      ...NODE_SHAPE_TYPES,
    ])
  })

  it("gives every shape a positive default size", () => {
    for (const shape of NODE_SHAPES) {
      expect(shape.width).toBeGreaterThan(0)
      expect(shape.height).toBeGreaterThan(0)
    }
  })

  it("resolves each shape type to its own definition", () => {
    for (const shape of NODE_SHAPES) {
      expect(getNodeShape(shape.type)).toBe(shape)
    }
  })

  it("falls back to the rectangle for unknown or missing shapes", () => {
    expect(getNodeShape(undefined).type).toBe("rectangle")
    expect(getNodeShape(NODE_SHAPES[0].type)).toBe(NODE_SHAPES[0])
    // Guards against a model returning a shape outside the allowed set.
    expect(getNodeShape("triangle" as NodeShape).type).toBe("rectangle")
  })
})

/* -------------------------------------------------------------------------- */
/*  Drag payload                                                              */
/* -------------------------------------------------------------------------- */

describe("shape drag payload", () => {
  it("exposes a stable, namespaced data format", () => {
    expect(SHAPE_DRAG_DATA_FORMAT).toBe("application/ghost-shape")
  })
})
