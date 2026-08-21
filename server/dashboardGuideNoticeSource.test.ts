import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Dashboard-Leitfadenhinweis", () => {
  it("nutzt ein Leitfaden-Icon und respektiert reduzierte Bewegung", () => {
    const source = readFileSync(new URL("../client/src/components/ThesisDashboardLayout.tsx", import.meta.url), "utf8");
    expect(source).toContain("BookOpenCheck");
    expect(source).toContain("requestAnimationFrame");
    expect(source).toContain("motion-reduce:transition-none");
    expect(source).toContain("duration-200");
  });
});
