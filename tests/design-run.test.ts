import { describe, expect, it } from "vitest"

import {
  describeDesignRunOutcome,
  describeDesignRunStartFailure,
  isTerminalDesignRunStatus,
} from "@/types/tasks"

/* -------------------------------------------------------------------------- */
/*  Terminal status detection                                                 */
/* -------------------------------------------------------------------------- */

describe("isTerminalDesignRunStatus", () => {
  it("is true for every status a run can never leave", () => {
    for (const status of [
      "COMPLETED",
      "CANCELED",
      "FAILED",
      "CRASHED",
      "SYSTEM_FAILURE",
      "EXPIRED",
      "TIMED_OUT",
    ]) {
      expect(isTerminalDesignRunStatus(status)).toBe(true)
    }
  })

  it("is false while the run is still being worked on", () => {
    for (const status of [
      "PENDING_VERSION",
      "QUEUED",
      "DEQUEUED",
      "EXECUTING",
      "WAITING",
      "DELAYED",
    ]) {
      expect(isTerminalDesignRunStatus(status)).toBe(false)
    }
  })

  it("is false for unknown statuses so an unfamiliar run stays active", () => {
    expect(isTerminalDesignRunStatus("SOMETHING_NEW")).toBe(false)
  })
})

/* -------------------------------------------------------------------------- */
/*  Outcome description                                                       */
/* -------------------------------------------------------------------------- */

describe("describeDesignRunOutcome", () => {
  it("uses the summary the task returned", () => {
    expect(
      describeDesignRunOutcome({
        status: "COMPLETED",
        output: { ok: true, summary: "Split the monolith into three services." },
      }),
    ).toEqual({
      kind: "complete",
      message: "Split the monolith into three services.",
    })
  })

  it("falls back to a default when the task returned nothing usable", () => {
    expect(describeDesignRunOutcome({ status: "COMPLETED" })).toEqual({
      kind: "complete",
      message: "Design applied to the canvas.",
    })

    expect(
      describeDesignRunOutcome({
        status: "COMPLETED",
        output: { summary: "   " },
      }).message,
    ).toBe("Design applied to the canvas.")

    expect(
      describeDesignRunOutcome({
        status: "COMPLETED",
        output: "not an object",
      }).message,
    ).toBe("Design applied to the canvas.")
  })

  it("reports a canceled run as canceled", () => {
    expect(describeDesignRunOutcome({ status: "CANCELED" })).toEqual({
      kind: "error",
      message: "Design generation was canceled.",
    })
  })

  it("prefixes a failure with the run's own error message", () => {
    expect(
      describeDesignRunOutcome({
        status: "FAILED",
        errorMessage: "  the model returned invalid JSON  ",
      }),
    ).toEqual({
      kind: "error",
      message: "Design generation failed. the model returned invalid JSON",
    })
  })

  it("never repeats the failure prefix", () => {
    expect(
      describeDesignRunOutcome({
        status: "CRASHED",
        errorMessage: "Design generation failed. out of memory",
      }).message,
    ).toBe("Design generation failed. out of memory")
  })

  it("still explains a failure that carries no message", () => {
    expect(
      describeDesignRunOutcome({ status: "SYSTEM_FAILURE", errorMessage: "  " }),
    ).toEqual({
      kind: "error",
      message: "The design run stopped before it could finish.",
    })
  })
})

/* -------------------------------------------------------------------------- */
/*  Start failures                                                            */
/* -------------------------------------------------------------------------- */

describe("describeDesignRunStartFailure", () => {
  it("explains a run that never reached the queue", () => {
    expect(describeDesignRunStartFailure("Forbidden")).toEqual({
      kind: "error",
      message: "The design run couldn't be started. Forbidden",
    })
  })

  it("falls back to a plain message when there is no detail", () => {
    expect(describeDesignRunStartFailure().message).toBe(
      "The design run couldn't be started.",
    )

    expect(describeDesignRunStartFailure("   ").message).toBe(
      "The design run couldn't be started.",
    )
  })
})
