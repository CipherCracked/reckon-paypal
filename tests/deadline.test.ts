import { describe, expect, it } from "vitest";
import {
  READ_DEADLINE_MS,
  MODEL_READ_DEADLINE_MS,
  withinDeadline,
  withBudget,
} from "@/lib/deadline";

describe("withinDeadline", () => {
  it("returns what the read produced when the read finishes in time", async () => {
    await expect(withinDeadline(async () => "read", 100)).resolves.toBe("read");
  });

  it("aborts the read when the budget is spent, rather than waiting forever", async () => {
    // The read hangs; the deadline is what ends it. This is the difference
    // between a page that renders in eight seconds and one that waits minutes.
    const started = Date.now();
    const result = await withinDeadline(
      (signal) =>
        new Promise<string>((resolve) => {
          signal.addEventListener("abort", () => resolve("aborted"));
        }),
      20,
    );

    expect(result).toBe("aborted");
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it("keeps the model's budget longer than a plain read's, because it is slower", () => {
    expect(MODEL_READ_DEADLINE_MS).toBeGreaterThan(READ_DEADLINE_MS);
  });
});

describe("withBudget", () => {
  it("returns the work's answer when it arrives in time", async () => {
    await expect(withBudget(Promise.resolve("read"), 100, "fallback")).resolves.toBe("read");
  });

  it("answers with the fallback when the work is too slow, without cancelling it", async () => {
    // The reading outlives this caller on purpose: it is expensive, and its
    // result is remembered for the next render.
    let finished = false;
    const work = new Promise<string>((resolve) => {
      setTimeout(() => {
        finished = true;
        resolve("read");
      }, 40);
    });

    await expect(withBudget(work, 5, "fallback")).resolves.toBe("fallback");
    expect(finished).toBe(false);

    await work;
    expect(finished).toBe(true);
  });

  it("answers with the fallback when the work fails", async () => {
    await expect(withBudget(Promise.reject(new Error("down")), 100, "fallback")).resolves.toBe(
      "fallback",
    );
  });
});
