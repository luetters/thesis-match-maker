import { useEffect } from "react";
import { useLocation } from "wouter";

type SeoDefinition = { title: string; description: string; indexable: boolean };

const PUBLIC_SEO: Record<string, SeoDefinition> = {
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
  "/abschlussarbeiten": {
    title: "Abschlussarbeiten im Überblick | HTW Berlin",
    description: "Anonymisierte, freigegebene Abschlussarbeitsabstracts der HTW Berlin – nach Fachbereich, Semester und Schlagwörtern durchsuchbar.",
    indexable: true,
  },
  "/studiengaenge": {
    title: "Studiengänge | Thesis Match Maker | HTW Berlin",
    description: "Öffentliche Übersicht der Studiengänge der HTW Berlin mit Informationen und weiterführenden Links.",
    indexable: true,
  },
};

function upsertMeta(name: string, content: string) {
  let element = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    document.head.appendChild(element);
  }
  element.content = content;
}

function removeCanonical() {
  document.head.querySelector('link[rel="canonical"]')?.remove();
}

export default function SeoMetadata() {
  const [location] = useLocation();

  useEffect(() => {
    const definition = PUBLIC_SEO[location] ?? (location.startsWith("/studiengaenge/")
      ? { title: "Studiengang | HTW Berlin", description: "Informationen zu einem Studiengang der HTW Berlin im Thesis Match Maker.", indexable: true }
      : { title: "Thesis Match Maker | HTW Berlin", description: "Thesis Match Maker der HTW Berlin.", indexable: false });

    document.title = definition.title;
    upsertMeta("description", definition.description);
    upsertMeta("robots", definition.indexable ? "index,follow,max-image-preview:large" : "noindex,nofollow,noarchive");

    const isPublicProductionDomain = window.location.hostname === "thesismatch.online" || window.location.hostname === "www.thesismatch.online";
    if (definition.indexable && isPublicProductionDomain) {
      let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.appendChild(canonical);
      }
      canonical.href = `https://thesismatch.online${location === "/" ? "/" : location}`;
    } else {
      removeCanonical();
    }

    const existing = document.getElementById("thesis-match-maker-structured-data");
    existing?.remove();
    if (!definition.indexable) return;
    const structuredData = {
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "EducationalOrganization", name: "HTW Berlin", url: isPublicProductionDomain ? "https://thesismatch.online/" : window.location.origin },
        { "@type": "WebSite", name: "Thesis Match Maker", inLanguage: "de", url: isPublicProductionDomain ? "https://thesismatch.online/" : window.location.origin },
      ],
    };
    const script = document.createElement("script");
    script.id = "thesis-match-maker-structured-data";
    script.type = "application/ld+json";
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }, [location]);

  return null;
}
