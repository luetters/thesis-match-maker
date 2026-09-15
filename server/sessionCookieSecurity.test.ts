import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./_core/cookies";

describe("Sitzungscookies", () => {
  it("sind im HTTPS-Betrieb HTTP-only, Secure und SameSite=Lax", () => {
    const options = getSessionCookieOptions({
      protocol: "https",
      hostname: "thesis.htw-berlin.com",
      headers: {},
    } as any);

    expect(options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });

  it("bleibt auch für lokale Entwicklung SameSite=Lax", () => {
    const options = getSessionCookieOptions({
      protocol: "http",
      hostname: "localhost",
      headers: {},
    } as any);

    expect(options).toMatchObject({ secure: false, sameSite: "lax" });
  });
});
