import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isLocalRequest(req: Request): boolean {
  const hostname = req.hostname ?? "";
  return LOCAL_HOSTS.has(hostname) || isIpAddress(hostname);
}

function isSecureRequest(req: Request): boolean {
  // 1. Express trust proxy: req.protocol ist "https" wenn der Proxy korrekt konfiguriert ist
  if (req.protocol === "https") return true;

  // 2. x-forwarded-proto Header (Cloud Run, nginx, Cloudflare, etc.)
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (forwardedProto) {
    const protoList = Array.isArray(forwardedProto)
      ? forwardedProto
      : forwardedProto.split(",");
    if (protoList.some(proto => proto.trim().toLowerCase() === "https")) {
      return true;
    }
  }

  // 3. Cloudflare-spezifischer Header
  const cfVisitor = req.headers["cf-visitor"];
  if (cfVisitor) {
    try {
      const parsed = JSON.parse(cfVisitor as string);
      if (parsed?.scheme === "https") return true;
    } catch {
      // ignore
    }
  }

  // 4. Produktion: Wenn kein lokaler Host → immer als HTTPS behandeln
  // Cloud Run, Manus-Hosting und ähnliche Plattformen terminieren TLS am Load Balancer
  // und leiten intern als HTTP weiter. Ohne trust-proxy-Konfiguration ist req.protocol="http".
  if (!isLocalRequest(req)) {
    return true;
  }

  return false;
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const secure = isSecureRequest(req);

  return {
    httpOnly: true,
    path: "/",
    // Das Portal wird stets als First-Party-Anwendung betrieben. Lax lässt
    // sichere Top-Level-Rückkehrwege zu und schützt unsichere Cross-Site-Posts.
    sameSite: "lax",
    secure,
  };
}
