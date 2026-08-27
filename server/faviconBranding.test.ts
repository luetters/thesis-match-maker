import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Projektfavicon", () => {
  it("bindet das Thesis-Match-Maker-Symbol statt einer externen Plattformmarke ein", () => {
    const indexHtml = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");
    const manifest = readFileSync(resolve(process.cwd(), "client/public/manifest.json"), "utf8");
    const favicon = readFileSync(resolve(process.cwd(), "client/public/thesis-match-favicon.svg"), "utf8");

    expect(indexHtml).toContain('href="/thesis-match-favicon.svg"');
    expect(indexHtml).not.toContain('href="/favicon.ico"');
    expect(manifest).toContain('"src": "/thesis-match-favicon.svg"');
    expect(favicon).toContain("Thesis Match Maker");
    expect(favicon).toContain("#76B900");
  });
});
