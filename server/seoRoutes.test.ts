import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectFile = (...segments: string[]) => resolve(process.cwd(), ...segments);

describe("öffentliche SEO-Endpunkte", () => {
  it("stellt Robots-Regeln mit Sitemap und privaten Ausschlüssen bereit", () => {
    const routes = readFileSync(projectFile("server", "seoRoutes.ts"), "utf8");
    expect(routes).toContain('app.get("/robots.txt"');
    expect(routes).toContain('`Sitemap: ${siteUrl}/sitemap.xml`');
    expect(routes).toContain('"/api/"');
    expect(routes).toContain('"/student"');
    expect(routes).toContain('"/superadmin"');
    expect(routes).toContain('"/profile"');
    expect(routes).toContain('res.set("X-Robots-Tag", "noindex, nofollow, noarchive")');
  });

  it("nimmt nur stabile öffentliche URLs und veröffentlichte Studiengänge in die Sitemap auf", () => {
    const routes = readFileSync(projectFile("server", "seoRoutes.ts"), "utf8");
    expect(routes).toContain('"/abschlussarbeiten"');
    expect(routes).toContain('"/studiengaenge"');
    expect(routes).toContain("getPublicProgrammes");
    expect(routes).toContain('`$\{siteUrl}/studiengaenge/$\{programme.id}`');
    expect(routes).not.toContain("getProgrammeManagementOverview");
  });
});
