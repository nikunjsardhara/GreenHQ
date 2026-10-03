import { describe, expect, test } from "bun:test";
import {
  ALL_STATUSES,
  LIFECYCLE_FLOW,
  LIFECYCLE_ORDER,
  allowedTargets,
  canTransition,
  nextGrowthStage,
} from "../src/lib/lifecycle";
import type { SaplingStatus } from "../src/db/schema";

const ALL: SaplingStatus[] = ["registered", "planted", "growing", "mature", "lost", "replaced"];

describe("lifecycle", () => {
  test("happy path: registered → planted → growing → mature", () => {
    expect(canTransition("registered", "planted")).toBe(true);
    expect(canTransition("planted", "growing")).toBe(true);
    expect(canTransition("growing", "mature")).toBe(true);
  });

  test("re-logging the same state is always allowed", () => {
    for (const s of ALL) expect(canTransition(s, s)).toBe(true);
  });

  test("lost is reachable from anywhere in the ground", () => {
    for (const s of ["registered", "planted", "growing", "mature"] as SaplingStatus[]) {
      expect(canTransition(s, "lost")).toBe(true);
    }
  });

  test("lost can only be replaced, never revived", () => {
    expect(canTransition("lost", "replaced")).toBe(true);
    for (const s of ["registered", "planted", "growing", "mature"] as SaplingStatus[]) {
      expect(canTransition("lost", s)).toBe(false);
    }
  });

  test("no skipping growth stages", () => {
    expect(canTransition("registered", "growing")).toBe(false);
    expect(canTransition("registered", "mature")).toBe(false);
    expect(canTransition("planted", "mature")).toBe(false);
  });

  test("no going backwards", () => {
    expect(canTransition("planted", "registered")).toBe(false);
    expect(canTransition("growing", "planted")).toBe(false);
    expect(canTransition("mature", "growing")).toBe(false);
  });

  test("replaced trees re-enter the growth flow", () => {
    expect(canTransition("replaced", "planted")).toBe(true);
    expect(canTransition("replaced", "growing")).toBe(true);
    expect(canTransition("replaced", "mature")).toBe(false);
    expect(canTransition("replaced", "registered")).toBe(false);
  });

  test("every state has at least one legal exit", () => {
    for (const s of ALL) expect(LIFECYCLE_FLOW[s].length).toBeGreaterThan(0);
  });

  test("stepper order walks the growth stages then stops", () => {
    expect(LIFECYCLE_ORDER).toEqual(["registered", "planted", "growing", "mature"]);
    expect(nextGrowthStage("registered")).toBe("planted");
    expect(nextGrowthStage("growing")).toBe("mature");
    expect(nextGrowthStage("mature")).toBeNull();
    expect(nextGrowthStage("lost")).toBeNull();
  });

  test("guided targets follow the flow table (lost offers replaced)", () => {
    expect(allowedTargets("lost", false)).toEqual(["replaced"]);
    expect(allowedTargets("planted", false)).toEqual(["growing", "lost", "replaced"]);
    expect(allowedTargets("registered", false)).toEqual(["planted", "lost"]);
  });

  test("override targets offer every other status", () => {
    for (const s of ALL_STATUSES) {
      const targets = allowedTargets(s, true);
      expect(targets).toHaveLength(ALL_STATUSES.length - 1);
      expect(targets).not.toContain(s);
      for (const other of ALL_STATUSES.filter((x) => x !== s)) {
        expect(targets).toContain(other);
      }
    }
  });
});
