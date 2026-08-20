import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("responsive E-Mail-Vorschau", () => {
  const source = readFileSync(resolve(process.cwd(), "client", "src", "pages", "EmailTemplatesTab.tsx"), "utf8");

  it("bietet eine explizite Umschaltung zwischen Desktop- und Mobilansicht", () => {
    expect(source).toContain('useState<"desktop" | "mobile">("desktop")');
    expect(source).toContain('setPreviewDevice("desktop")');
    expect(source).toContain('setPreviewDevice("mobile")');
    expect(source).toContain("Mobil · 375 px");
    expect(source).toContain('aria-label="Ansicht für die E-Mail-Vorschau auswählen"');
  });

  it("rendert die Mobilansicht in einer realitätsnahen 375-Pixel-Vorschau", () => {
    expect(source).toContain('w-[375px]');
    expect(source).toContain('max-w-full');
    expect(source).toContain('border-[7px] border-slate-900');
    expect(source).toContain('previewDevice === "mobile" ? "h-[540px]" : "h-80"');
  });

  it("verwendet weiterhin die aufgelöste produktive Vorlage und eine sichere iframe-Sandbox", () => {
    expect(source).toContain('srcDoc={previewHtml ||');
    expect(source).toContain('sandbox=""');
    expect(source).toContain('fillEmailTemplatePreview(getCurrentSubject(), activeLang)');
    expect(source).toContain("Die Vorschau verwendet denselben Vorlageninhalt wie die Test-E-Mail.");
  });
});
