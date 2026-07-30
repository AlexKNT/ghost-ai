import type { Node, Edge } from "@xyflow/react"
import type { CanvasNodeData, CanvasEdgeData } from "@/types/canvas"

/* -------------------------------------------------------------------------- */
/*  Template type                                                             */
/* -------------------------------------------------------------------------- */

export interface CanvasTemplate {
  id: string
  name: string
  description: string
  nodes: Node[]
  edges: Edge[]
}

/* -------------------------------------------------------------------------- */
/*  Color palette shortcut                                                    */
/* -------------------------------------------------------------------------- */

const C = {
  neutral: { fill: "#1F1F1F", text: "#EDEDED" },
  blue:    { fill: "#10233D", text: "#52A8FF" },
  purple:  { fill: "#2E1938", text: "#BF7AF0" },
  orange:  { fill: "#331B00", text: "#FF990A" },
  red:     { fill: "#3C1618", text: "#FF6166" },
  pink:    { fill: "#3A1726", text: "#F75F8F" },
  green:   { fill: "#0F2E18", text: "#62C073" },
  teal:    { fill: "#062822", text: "#0AC7B4" },
} as const

/* -------------------------------------------------------------------------- */
/*  Template builder — keeps ID counter consistent per template               */
/* -------------------------------------------------------------------------- */

interface NodeSpec {
  label: string
  x: number
  y: number
  shape?: CanvasNodeData["shape"]
  color?: { fill: string; text: string }
  width?: number
  height?: number
}

interface EdgeSpec {
  label?: string
}

class TemplateBuilder {
  private nextId = 1

  node(spec: NodeSpec): Node {
    const id = `tpl-${this.nextId++}`
    const shape = spec.shape ?? "rectangle"
    const color = spec.color ?? C.neutral
    return {
      id,
      type: "canvasNode",
      position: { x: spec.x, y: spec.y },
      data: {
        label: spec.label,
        color: color.fill,
        textColor: color.text,
        shape,
        width: spec.width ?? 160,
        height: spec.height ?? 80,
      } satisfies CanvasNodeData,
    }
  }

  edge(
    source: Node,
    target: Node,
    spec: EdgeSpec = {},
  ): Edge {
    return {
      id: `tpl-${this.nextId++}`,
      type: "canvasEdge",
      source: source.id,
      target: target.id,
      data: { label: spec.label ?? "" } satisfies CanvasEdgeData,
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Templates                                                                 */
/* -------------------------------------------------------------------------- */

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  /* ---- Microservices --------------------------------------------------- */
  (() => {
    const b = new TemplateBuilder()

    const gw       = b.node({ label: "API Gateway",       x: 400, y: 20,  shape: "hexagon",  color: C.purple })
    const auth     = b.node({ label: "Auth Service",       x: 150, y: 180, shape: "pill",     color: C.blue })
    const users    = b.node({ label: "User Service",       x: 400, y: 180, shape: "pill",     color: C.blue })
    const orders   = b.node({ label: "Order Service",      x: 650, y: 180, shape: "pill",     color: C.blue })
    const mq       = b.node({ label: "Message Queue",      x: 400, y: 340, shape: "cylinder", color: C.orange })
    const notify   = b.node({ label: "Notifications",      x: 650, y: 340, shape: "pill",     color: C.green,  height: 80 })
    const authDb   = b.node({ label: "Auth DB",            x: 150, y: 340, shape: "cylinder", color: C.teal })
    const usersDb  = b.node({ label: "Users DB",           x: 300, y: 340, shape: "cylinder", color: C.teal })
    const ordersDb = b.node({ label: "Orders DB",          x: 525, y: 340, shape: "cylinder", color: C.teal })

    return {
      id: "microservices",
      name: "Microservices",
      description:
        "API Gateway routing to independent services backed by dedicated databases, with async messaging between services.",
      nodes: [gw, auth, users, orders, mq, notify, authDb, usersDb, ordersDb],
      edges: [
        b.edge(gw, auth,    { label: "/auth" }),
        b.edge(gw, users,   { label: "/users" }),
        b.edge(gw, orders,  { label: "/orders" }),
        b.edge(auth,    authDb),
        b.edge(users,   usersDb),
        b.edge(orders,  ordersDb),
        b.edge(orders,  mq,     { label: "events" }),
        b.edge(mq,      notify, { label: "consume" }),
      ],
    } satisfies CanvasTemplate
  })(),

  /* ---- CI/CD Pipeline ------------------------------------------------- */
  (() => {
    const b = new TemplateBuilder()

    const repo    = b.node({ label: "Git Repository", x: 400, y: 20,  shape: "cylinder",  color: C.orange })
    const build   = b.node({ label: "Build",          x: 400, y: 160, shape: "rectangle", color: C.blue })
    const test    = b.node({ label: "Test",           x: 400, y: 300, shape: "rectangle", color: C.teal })
    const staging = b.node({ label: "Staging",        x: 200, y: 440, shape: "diamond",   color: C.purple })
    const prod    = b.node({ label: "Production",     x: 600, y: 440, shape: "diamond",   color: C.green })
    const monitor = b.node({ label: "Monitoring",     x: 400, y: 560, shape: "hexagon",   color: C.red })

    return {
      id: "cicd-pipeline",
      name: "CI/CD Pipeline",
      description:
        "Code flows from repository through build, test, and deploy stages into production infrastructure.",
      nodes: [repo, build, test, staging, prod, monitor],
      edges: [
        b.edge(repo,  build,   { label: "push" }),
        b.edge(build, test),
        b.edge(test,  staging, { label: "pass" }),
        b.edge(test,  prod,    { label: "pass" }),
        b.edge(staging, monitor),
        b.edge(prod,    monitor),
      ],
    } satisfies CanvasTemplate
  })(),

  /* ---- Event-Driven System -------------------------------------------- */
  (() => {
    const b = new TemplateBuilder()

    const web       = b.node({ label: "Web App",           x: 150, y: 20,  shape: "hexagon",  color: C.purple })
    const mobile    = b.node({ label: "Mobile App",        x: 400, y: 20,  shape: "hexagon",  color: C.purple })
    const iot       = b.node({ label: "IoT Devices",       x: 650, y: 20,  shape: "hexagon",  color: C.purple })
    const bus       = b.node({ label: "Event Bus",         x: 400, y: 200, shape: "circle",   color: C.orange, width: 120, height: 120 })
    const payment   = b.node({ label: "Payments",          x: 50,  y: 380, shape: "pill",     color: C.green })
    const inventory = b.node({ label: "Inventory",         x: 280, y: 380, shape: "pill",     color: C.green })
    const analytics = b.node({ label: "Analytics",         x: 530, y: 380, shape: "pill",     color: C.green })
    const audit     = b.node({ label: "Audit Log",         x: 750, y: 380, shape: "cylinder", color: C.teal })

    return {
      id: "event-driven",
      name: "Event-Driven",
      description:
        "Producers emit events to a central bus; consumers subscribe and react through dedicated processors.",
      nodes: [web, mobile, iot, bus, payment, inventory, analytics, audit],
      edges: [
        b.edge(web,    bus, { label: "events" }),
        b.edge(mobile, bus, { label: "events" }),
        b.edge(iot,    bus, { label: "events" }),
        b.edge(bus, payment,   { label: "order.created" }),
        b.edge(bus, inventory, { label: "order.created" }),
        b.edge(bus, analytics, { label: "*" }),
        b.edge(bus, audit,     { label: "*" }),
      ],
    } satisfies CanvasTemplate
  })(),
]
