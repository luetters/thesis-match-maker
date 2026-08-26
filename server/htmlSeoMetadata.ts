import type { Request } from "express";

type Metadata = { title: string; description: string; indexable: boolean };

const PUBLIC_METADATA: Record<string, Metadata> = {
  "/": {
    title: "Thesis Match Maker | HTW Berlin",
    description: "Thesis Match Maker unterstützt Studierende, Prüfer:innen und Verwaltung der HTW Berlin bei der Organisation von Abschlussarbeiten.",
    indexable: true,
  },
  "/faq": {
    title: "FAQ zum Thesis Match Maker | HTW Berlin",
    description: "Antworten für Studierende, Erstprüfer:innen, Zweitprüfer:innen und Verwaltung zum Thesis Match Maker der HTW Berlin.",
    indexable: true,
  },
  "/examiners": {
    title: "Prüfer:innen finden | Thesis Match Maker | HTW Berlin",
    description: "Öffentliches Verzeichnis der Prüfer:innen im Thesis Match Maker der HTW Berlin.",
    indexable: true,
  },
  "/studiengaenge": {
    title: "Studiengänge | Thesis Match Maker | HTW Berlin",
    description: "Öffentliche Übersicht der Studiengänge der HTW Berlin mit Informationen und weiterführenden Links.",
    indexable: true,
  },
  "/abschlussarbeiten": {
    title: "Abschlussarbeiten im Überblick | HTW Berlin",
    description: "Anonymisierte, freigegebene Abschlussarbeitsabstracts der HTW Berlin – nach Fachbereich, Semester und Schlagwörtern durchsuchbar.",
    indexable: true,
  },
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[character] ?? character));
}

function metadataForPath(pathname: string): Metadata {
  if (PUBLIC_METADATA[pathname]) return PUBLIC_METADATA[pathname];
  if (/^\/studiengaenge\/\d+$/.test(pathname)) {
    return {
      title: "Studiengang | HTW Berlin",
      description: "Informationen zu einem Studiengang der HTW Berlin im Thesis Match Maker.",
      indexable: true,
    };
  }
  return { title: "Thesis Match Maker | HTW Berlin", description: "Thesis Match Maker der HTW Berlin.", indexable: false };
}

function canonicalOrigin(req: Request) {
  const configured = process.env.SITE_URL?.trim();
  if (configured === "https://thesismatch.online" || configured === "https://www.thesismatch.online") return "https://thesismatch.online";
  const host = req.get("host")?.toLowerCase();
  if (host === "thesismatch.online" || host === "www.thesismatch.online") return "https://thesismatch.online";
  return null;
}

export function injectHtmlSeoMetadata(template: string, req: Request) {
  const pathname = new URL(req.originalUrl || req.url, "http://localhost").pathname;
  const metadata = metadataForPath(pathname);
  const title = escapeHtml(metadata.title);
  const description = escapeHtml(metadata.description);
  const canonicalBase = canonicalOrigin(req);
  const canonical = canonicalBase && metadata.indexable ? `${canonicalBase}${pathname}` : null;
  const socialTags = metadata.indexable
    ? [
      `<meta property="og:title" content="${title}" />`,
      `<meta property="og:description" content="${description}" />`,
      '<meta property="og:type" content="website" />',
      canonical ? `<meta property="og:url" content="${escapeHtml(canonical)}" />` : "",
      '<meta name="twitter:card" content="summary" />',
    ].filter(Boolean).join("\n    ")
    : "";
  const tags = [
    `<meta name="robots" content="${metadata.indexable ? "index,follow,max-image-preview:large" : "noindex,nofollow,noarchive"}" />`,
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}" />` : "",
    socialTags,
  ].filter(Boolean).join("\n    ");

  return template
    .replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/i, `<meta name="description" content="${description}" />`)
    .replace("</head>", `    ${tags}\n  </head>`);
}
