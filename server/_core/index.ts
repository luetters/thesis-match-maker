import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerUploadRoutes } from "../uploadRoutes";
import { registerExportRoutes } from "../exportRoutes";
import { registerMagicLinkRoutes } from "../magicLinkRoutes";
import { registerSamlAuthRoutes } from "../samlAuthRoutes";
import { appRouter } from "../routers";
import { processColloquiumSchedulingReminders } from "../colloquiumScheduling";
import { processOverdueTwoFactorReminders } from "../twoFactorReminder";
import { createContext } from "./context";
import { sdk } from "./sdk";
import { serveStatic, setupVite } from "./vite";
import { maintenanceMiddleware } from "../maintenanceMiddleware";
import { startScheduler } from "../scheduler";
import { registerMigrationExportRoutes } from "../migrationExport";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Trust reverse proxy (Cloud Run, Cloudflare) so req.protocol reflects x-forwarded-proto
  app.set("trust proxy", true);
  app.disable("x-powered-by");
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        mediaSrc: ["'self'", "blob:", "https:"],
        connectSrc: ["'self'", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        fontSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'", "https:"],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }));
  // tRPC payloads are text metadata only; file routes use dedicated multer limits.
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
    handler: (_req, res) => res.status(429).json({ error: "Zu viele Anfragen. Bitte versuchen Sie es später erneut." }),
  });
  const authenticationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ""),
    handler: (_req, res) => res.status(429).json({ error: "Zu viele Anmeldeversuche. Bitte warten Sie 15 Minuten." }),
  });
  app.use("/api", apiLimiter);
  app.use([
    "/api/trpc/auth/loginWithPassword",
    "/api/trpc/auth.requestPasswordReset",
    "/api/trpc/auth.resetPassword",
    "/api/trpc/auth.register",
  ], authenticationLimiter);
  registerStorageProxy(app);
  registerMigrationExportRoutes(app);
  registerOAuthRoutes(app);
  registerUploadRoutes(app);
  registerExportRoutes(app);
  registerMagicLinkRoutes(app); // Nur noch Logout-Route
  registerSamlAuthRoutes(app); // Optionale SAML-2.0-Anmeldung
  // Heartbeat: automatische E-Mail-Erinnerungen drei und einen Tag vor Ablauf
  // einer offenen Kolloquiums-Terminabstimmung. taskUid ist serverseitig durch
  // den Heartbeat authentifiziert und wird nie aus dem Request-Body gelesen.
  app.post("/api/scheduled/colloquium-scheduling-reminders", async (req, res) => {
    try {
      // Eigenständiger Modus: CRON_SECRET-Header prüfen
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret && req.headers["x-cron-secret"] === cronSecret) {
        // Authentifiziert über lokalen Cron-Schlüssel
        const result = await processColloquiumSchedulingReminders("local-cron");
        return res.json(result);
      }
      // Manus Heartbeat: SDK-Authentifizierung
      try {
        const cronUser = await sdk.authenticateRequest(req);
        if (!cronUser.isCron || !cronUser.taskUid) {
          return res.status(403).json({ error: "cron-only" });
        }
        const result = await processColloquiumSchedulingReminders(cronUser.taskUid);
        return res.json(result);
      } catch {
        return res.status(403).json({ error: "Nicht autorisiert." });
      }
    } catch (error) {
      console.error("[ColloquiumSchedulingHeartbeat]", error);
      return res.status(500).json({ error: "Die geplante Verarbeitung konnte nicht abgeschlossen werden." });
    }
  });
  // Heartbeat: tägliche, einmalige Erinnerung bei abgelaufener 2FA-Einrichtungsfrist.
  app.post("/api/scheduled/two-factor-overdue-reminders", async (req, res) => {
    try {
      // Eigenständiger Modus: CRON_SECRET-Header prüfen
      const cronSecret = process.env.CRON_SECRET;
      if (cronSecret && req.headers["x-cron-secret"] === cronSecret) {
        return res.json(await processOverdueTwoFactorReminders("local-cron"));
      }
      // Manus Heartbeat: SDK-Authentifizierung
      try {
        const cronUser = await sdk.authenticateRequest(req);
        if (!cronUser.isCron || !cronUser.taskUid) {
          return res.status(403).json({ error: "cron-only" });
        }
        return res.json(await processOverdueTwoFactorReminders(cronUser.taskUid));
      } catch {
        return res.status(403).json({ error: "Nicht autorisiert." });
      }
    } catch (error) {
      console.error("[TwoFactorReminderHeartbeat]", error);
      return res.status(500).json({ error: "Die geplante 2FA-Erinnerung konnte nicht abgeschlossen werden." });
    }
  });
  // Wartungsmodus-Middleware (vor tRPC und statischen Dateien)
  app.use(maintenanceMiddleware());
  // tRPC API – kein Caching (verhindert veraltete Profil-/Auth-Daten nach Updates)
  app.use("/api/trpc", (_req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    next();
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Eigenständigen Scheduler starten (nur wenn SCHEDULER_ENABLED=true)
    startScheduler(port);
  });
}

startServer().catch(console.error);
