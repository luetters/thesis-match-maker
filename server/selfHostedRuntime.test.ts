import { afterEach, describe, expect, it, vi } from "vitest";

const originalAppId = process.env.VITE_APP_ID;
const originalLegacyFlag = process.env.ENABLE_LEGACY_PLATFORM_INTEGRATIONS;

afterEach(() => {
  if (originalAppId === undefined) delete process.env.VITE_APP_ID;
  else process.env.VITE_APP_ID = originalAppId;

  if (originalLegacyFlag === undefined) delete process.env.ENABLE_LEGACY_PLATFORM_INTEGRATIONS;
  else process.env.ENABLE_LEGACY_PLATFORM_INTEGRATIONS = originalLegacyFlag;

  vi.resetModules();
});

describe("unabhängige Laufzeitkonfiguration", () => {
  it("verwendet ohne Plattformkennung eine lokale Sitzungskennung", async () => {
    delete process.env.VITE_APP_ID;
    vi.resetModules();

    const { getSessionApplicationId } = await import("./_core/sdk");
    expect(getSessionApplicationId()).toBe("thesis-match-maker");
  });

  it("deaktiviert Legacy-Plattformintegrationen standardmäßig", async () => {
    delete process.env.ENABLE_LEGACY_PLATFORM_INTEGRATIONS;
    vi.resetModules();

    const { ENV } = await import("./_core/env");
    expect(ENV.legacyPlatformIntegrations).toBe(false);
  });

  it("aktiviert Legacy-Plattformintegrationen nur mit ausdrücklichem Schalter", async () => {
    process.env.ENABLE_LEGACY_PLATFORM_INTEGRATIONS = "true";
    vi.resetModules();

    const { ENV } = await import("./_core/env");
    expect(ENV.legacyPlatformIntegrations).toBe(true);
  });
});
