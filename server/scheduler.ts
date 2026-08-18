/**
 * Eigenständiger Hintergrundjob-Scheduler.
 *
 * Ersetzt Manus Heartbeat durch node-cron im selben Prozess.
 * Wird nur aktiviert, wenn SCHEDULER_ENABLED=true gesetzt ist
 * (auf IONOS/eigenem Server). Auf Manus bleibt Heartbeat aktiv.
 *
 * Jeder Job ruft denselben HTTP-Endpunkt auf wie Heartbeat,
 * authentifiziert sich aber über einen lokalen Cron-Schlüssel
 * statt über die Manus-SDK-Identität.
 */

import * as cron from "node-cron";

/** Letzte Ausführungsergebnisse für die Status-Abfrage im Admin-Dashboard */
export interface JobExecution {
  name: string;
  lastRun: string | null;
  lastStatus: number | null;
  lastResult: string | null;
}

const jobExecutions: Map<string, JobExecution> = new Map();

export interface ScheduledJob {
  name: string;
  /** Standard 5-Feld-Cron (min hour dom mon dow) */
  schedule: string;
  /** Lokaler Pfad, z. B. /api/scheduled/colloquium-scheduling-reminders */
  path: string;
  method?: "POST" | "PUT";
}

const registeredJobs: Map<string, ReturnType<typeof cron.schedule>> = new Map();

/**
 * Startet den eigenständigen Scheduler, wenn SCHEDULER_ENABLED=true.
 * Ruft die registrierten Endpunkte über localhost auf.
 */
export function startScheduler(port: number): void {
  if (process.env.SCHEDULER_ENABLED !== "true") {
    console.log("[Scheduler] Deaktiviert (SCHEDULER_ENABLED !== true). Heartbeat wird verwendet.");
    return;
  }

  const cronSecret = process.env.CRON_SECRET ?? "";
  if (!cronSecret) {
    console.warn("[Scheduler] CRON_SECRET nicht gesetzt – Hintergrundjobs werden ohne Authentifizierung aufgerufen.");
  }

  const jobs: ScheduledJob[] = [
    {
      name: "colloquium-scheduling-reminders",
      schedule: "0 8 * * *",  // täglich 08:00 UTC
      path: "/api/scheduled/colloquium-scheduling-reminders",
      method: "POST",
    },
    {
      name: "two-factor-overdue-reminders",
      schedule: "0 8 * * *",  // täglich 08:00 UTC
      path: "/api/scheduled/two-factor-overdue-reminders",
      method: "POST",
    },
  ];

  for (const job of jobs) {
    if (!cron.validate(job.schedule)) {
      console.error(`[Scheduler] Ungültiger Cron-Ausdruck für "${job.name}": ${job.schedule}`);
      continue;
    }

    const task = cron.schedule(job.schedule, async () => {
      console.log(`[Scheduler] Job "${job.name}" wird ausgeführt…`);
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (cronSecret) headers["x-cron-secret"] = cronSecret;
        const resp = await fetch(`http://127.0.0.1:${port}${job.path}`, {
          method: job.method ?? "POST",
          headers,
        });
        const body = await resp.text().catch(() => "");
        console.log(`[Scheduler] Job "${job.name}" abgeschlossen: ${resp.status} ${body.slice(0, 200)}`);
        jobExecutions.set(job.name, {
          name: job.name,
          lastRun: new Date().toISOString(),
          lastStatus: resp.status,
          lastResult: body.slice(0, 500),
        });
      } catch (err) {
        console.error(`[Scheduler] Job "${job.name}" fehlgeschlagen:`, err);
        jobExecutions.set(job.name, {
          name: job.name,
          lastRun: new Date().toISOString(),
          lastStatus: null,
          lastResult: err instanceof Error ? err.message : "Unbekannter Fehler",
        });
      }
    }, { timezone: "UTC" });

    registeredJobs.set(job.name, task);
    console.log(`[Scheduler] Job "${job.name}" registriert: ${job.schedule} UTC → ${job.path}`);
  }
}

export function stopScheduler(): void {
  for (const [name, task] of Array.from(registeredJobs.entries())) {
    task.stop();
    console.log(`[Scheduler] Job "${name}" gestoppt.`);
  }
  registeredJobs.clear();
}

/** Gibt den aktuellen Status aller registrierten Jobs zurück. */
export function getSchedulerStatus(): {
  enabled: boolean;
  jobCount: number;
  jobs: Array<ScheduledJob & { lastExecution: JobExecution | null }>;
} {
  const enabled = process.env.SCHEDULER_ENABLED === "true";
  const jobDefs: ScheduledJob[] = [
    { name: "colloquium-scheduling-reminders", schedule: "0 8 * * *", path: "/api/scheduled/colloquium-scheduling-reminders", method: "POST" },
    { name: "two-factor-overdue-reminders", schedule: "0 8 * * *", path: "/api/scheduled/two-factor-overdue-reminders", method: "POST" },
  ];
  return {
    enabled,
    jobCount: registeredJobs.size,
    jobs: jobDefs.map(j => ({
      ...j,
      lastExecution: jobExecutions.get(j.name) ?? null,
    })),
  };
}
