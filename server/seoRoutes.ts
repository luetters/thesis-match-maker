import type { Express, Request } from "express";
import { getPublicProgrammes } from "./db";

const PRIVATE_PATHS = [
  "/api/",
  "/login",
  "/register",
  "/reset-password",
  "/student",
  "/examiner",
  "/admin",
  "/superadmin",
  "/profile",
  "/verify",
  "/select-role",
  "/role-pending",
];

const STATIC_PUBLIC_PATHS = ["/", "/faq", "/examiners", "/studiengaenge", "/abschlussarbeiten"];

function publicSiteUrl(req: Request) {
  const configured = process.env.SITE_URL?.trim();
  if (configured && /^https?:\/\//i.test(configured)) return configured.replace(/\/$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;",
  }[character] ?? character));
}

function asLastModified(value: unknown) {
  if (!value) return undefined;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

export function registerSeoRoutes(app: Express) {
  app.use((req, res, next) => {
    if (PRIVATE_PATHS.some((path) => req.path === path || req.path.startsWith(`${path}/`))) {
      res.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    }
    next();
  });

  app.get("/robots.txt", (req, res) => {
    const siteUrl = publicSiteUrl(req);
    const body = [
      "User-agent: *",
      "Allow: /",
      ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
      `Sitemap: ${siteUrl}/sitemap.xml`,
      "",
    ].join("\n");
    res.type("text/plain").set("Cache-Control", "public, max-age=3600").send(body);
  });

  app.get("/sitemap.xml", async (req, res) => {
    try {
      const siteUrl = publicSiteUrl(req);
      const programmes = await getPublicProgrammes();
      const urls: Array<{ loc: string; lastmod?: string }> = [
        ...STATIC_PUBLIC_PATHS.map((path) => ({ loc: `${siteUrl}${path}` })),
        ...programmes.map((programme) => ({
          loc: `${siteUrl}/studiengaenge/${programme.id}`,
          lastmod: asLastModified(programme.updatedAt),
        })),
      ];
      const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escapeXml(url.loc)}</loc>${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`;
      res.type("application/xml").set("Cache-Control", "public, max-age=3600").send(body);
    } catch (error) {
      console.error("[SEO] Sitemap konnte nicht erzeugt werden", error);
      res.status(503).type("application/xml").send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><error>temporarily unavailable</error>");
    }
  });
}
