import type { Express, Request, Response } from "express";
import { generateServiceProviderMetadata } from "@node-saml/node-saml";
import { SignJWT } from "jose";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { getSystemSettings, getUserByEmail, getUserBySamlIdentity, getUserRoles, linkSamlIdentity, logLoginAttempt } from "./db";
import { createSamlClient, getSafeSamlReturnTo, getSamlConfigurationIssues, getSamlProfileIdentity, isSamlConfigurationReady, parseSamlConfiguration } from "./samlAuth";

async function loadSamlConfiguration() {
  const settings = await getSystemSettings();
  return parseSamlConfiguration(Object.fromEntries(settings.map((setting) => [setting.key, setting.value])));
}

function redirectToLogin(res: Response, code: string) {
  res.redirect(`/saml/error?code=${encodeURIComponent(code)}`);
}

export function registerSamlAuthRoutes(app: Express) {
  app.get("/api/auth/saml/metadata", async (_req: Request, res: Response) => {
    try {
      const configuration = await loadSamlConfiguration();
      if (!configuration.spEntityId.startsWith("https://") || !configuration.acsUrl.startsWith("https://")) {
        return res.status(503).type("text/plain").send("SAML service-provider metadata is not configured.");
      }
      res.type("application/samlmetadata+xml").send(generateServiceProviderMetadata({
        issuer: configuration.spEntityId,
        callbackUrl: configuration.acsUrl,
        wantAssertionsSigned: true,
      }));
    } catch (error) {
      console.error("[SAML] Metadata konnte nicht erstellt werden:", error);
      res.status(500).type("text/plain").send("SAML metadata unavailable.");
    }
  });

  app.get("/api/auth/saml/login", async (req: Request, res: Response) => {
    try {
      const configuration = await loadSamlConfiguration();
      if (!configuration.enabled || !isSamlConfigurationReady(configuration)) return redirectToLogin(res, "saml_not_available");
      const saml = createSamlClient(configuration);
      const returnTo = getSafeSamlReturnTo(req.query.returnTo);
      const redirectUrl = await saml.getAuthorizeUrlAsync(returnTo, req.get("host"), {});
      res.redirect(redirectUrl);
    } catch (error) {
      console.error("[SAML] Anmeldung konnte nicht gestartet werden:", error);
      redirectToLogin(res, "saml_start_failed");
    }
  });

  app.post("/api/auth/saml/acs", async (req: Request, res: Response) => {
    try {
      const configuration = await loadSamlConfiguration();
      if (!configuration.enabled || !isSamlConfigurationReady(configuration)) return redirectToLogin(res, "saml_not_available");
      const saml = createSamlClient(configuration);
      const { profile } = await saml.validatePostResponseAsync(req.body);
      if (!profile) return redirectToLogin(res, "saml_invalid_response");
      const identity = getSamlProfileIdentity(profile, configuration);
      if (!identity.subject || !identity.issuer || !identity.email) return redirectToLogin(res, "saml_missing_attributes");

      let user = await getUserBySamlIdentity(identity.issuer, identity.subject);
      if (!user) {
        const userByEmail = await getUserByEmail(identity.email);
        if (!userByEmail) return redirectToLogin(res, "saml_account_not_found");
        user = userByEmail;
        await linkSamlIdentity(user.id, identity.issuer, identity.subject);
      }

      const roleStatus = user.roleStatus ?? "approved";
      if (roleStatus !== "approved") return redirectToLogin(res, roleStatus === "pending" ? "saml_pending" : "saml_rejected");

      const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "");
      const sessionToken = await new SignJWT({
        openId: user.openId,
        appId: process.env.VITE_APP_ID ?? "",
        name: user.name ?? user.email ?? "",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(Math.floor((Date.now() + 365 * 24 * 60 * 60 * 1000) / 1000))
        .sign(secret);
      res.cookie(COOKIE_NAME, sessionToken, { ...getSessionCookieOptions(req), maxAge: 365 * 24 * 60 * 60 * 1000 });
      await logLoginAttempt({
        email: identity.email,
        success: true,
        failureReason: "SAML-2.0-Anmeldung über HTW Berlin Web Login",
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      const roles = await getUserRoles(user.id);
      const effectiveRoles = roles.length > 0 ? roles : [user.role];
      const destination = effectiveRoles.includes("superadmin") ? "/superadmin" : effectiveRoles.includes("admin") ? "/admin" : effectiveRoles.includes("student") ? "/student" : effectiveRoles.includes("examiner") || effectiveRoles.includes("second_examiner") ? "/examiner" : "/";
      res.redirect(getSafeSamlReturnTo(req.body.RelayState) === "/" ? destination : getSafeSamlReturnTo(req.body.RelayState));
    } catch (error) {
      console.error("[SAML] Antwort konnte nicht validiert werden:", error);
      redirectToLogin(res, "saml_validation_failed");
    }
  });
}
