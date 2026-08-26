import { describe, expect, it } from "vitest";
import { injectHtmlSeoMetadata } from "./htmlSeoMetadata";

const template = '<html><head><title>Fallback</title><meta name="description" content="Fallback" /></head><body></body></html>';
const requestFor = (path: string, host = "thesismatch.online") => ({ originalUrl: path, url: path, get: (key: string) => key === "host" ? host : undefined }) as any;

describe("serverseitige SEO-Metadaten", () => {
  it("liefert öffentliche Metadaten, Canonical und Social-Vorschau ohne JavaScript", () => {
    const html = injectHtmlSeoMetadata(template, requestFor("/studiengaenge"));
    expect(html).toContain("Studiengänge | Thesis Match Maker | HTW Berlin");
    expect(html).toContain('name="robots" content="index,follow,max-image-preview:large"');
    expect(html).toContain('rel="canonical" href="https://thesismatch.online/studiengaenge"');
    expect(html).toContain('property="og:title"');
  });

  it("gibt privaten Routen keine Canonical- oder Social-Vorschau und setzt noindex", () => {
    const html = injectHtmlSeoMetadata(template, requestFor("/admin"));
    expect(html).toContain('name="robots" content="noindex,nofollow,noarchive"');
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('property="og:title"');
  });

  it("unterdrückt Canonicals in Vorschau- und lokalen Umgebungen", () => {
    const html = injectHtmlSeoMetadata(template, requestFor("/faq", "localhost:3000"));
    expect(html).toContain('property="og:title"');
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain('property="og:url"');
  });
});
