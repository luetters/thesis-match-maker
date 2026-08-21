import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

function readWorkflow(relativePath: string) {
  return readFileSync(resolve(projectRoot, relativePath), "utf8");
}

describe("IONOS Deploy Now workflows after project removal", () => {
  it("keeps the orphaned orchestration workflow manual-only", () => {
    const workflow = readWorkflow(".github/workflows/thesis-match-maker-orchestration.yaml");

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toMatch(/^\s*-\s+push\s*$/m);
    expect(workflow).not.toMatch(/^\s+push:\s*$/m);
  });

  it("keeps deployment dispatches manual-only until a new IONOS project exists", () => {
    const workflow = readWorkflow(".github/workflows/deploy-to-ionos.yaml");

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).not.toMatch(/^\s+push:\s*$/m);
  });
});
