import axe from "axe-core";
import { expect } from "vitest";

// jsdom applies no stylesheet and does no layout, so anything colour- or
// geometry-dependent can't be judged here. Contrast is guarded statically in
// src/test/contrast.test.ts instead.
const UNRUNNABLE_IN_JSDOM = ["color-contrast", "target-size"];

export const expectNoA11yViolations = async (container: HTMLElement) => {
  const results = await axe.run(container, {
    rules: Object.fromEntries(
      UNRUNNABLE_IN_JSDOM.map((id) => [id, { enabled: false }]),
    ),
  });

  const report = results.violations
    .map(
      (v) =>
        `${v.id} (${v.impact}) — ${v.help}\n    ` +
        v.nodes.map((n) => n.target.join(" ")).join("\n    "),
    )
    .join("\n");

  expect(report).toBe("");
};
