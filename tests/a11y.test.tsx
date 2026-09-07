// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import App from "../src/App";

describe("accessibility", () => {
  test("the app shell has no axe violations (colour contrast needs a real renderer and is skipped)", async () => {
    const { container } = render(<App />);
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    const summary = results.violations.map(
      (v) => `${v.id}: ${v.help} [${v.nodes.length}] ${v.nodes[0]?.html.slice(0, 100)}`,
    );
    expect(summary).toEqual([]);
  });
});
