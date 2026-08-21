import { describe, expect, it } from "vitest";
import { PORTABLE_TRANSFER_FORMAT, PORTABLE_TRANSFER_VERSION, createPortableTransferManifest, omitSensitiveTransferFields, validatePortableTransferManifest } from "@shared/portableTransfer";

describe("portableTransfer", () => {
  it("removes credentials and reusable authentication material from user rows", () => {
    const result = omitSensitiveTransferFields({ id: 7, email: "person@example.org", passwordHash: "hash", twoFactorSecret: "secret", openId: "provider-id", samlSubject: "saml", role: "student" }, "users");
    expect(result).toMatchObject({ id: 7, email: "person@example.org", role: "student", loginMethod: "password", twoFactorEnabled: 0 });
    expect(result).not.toHaveProperty("passwordHash");
    expect(result).not.toHaveProperty("twoFactorSecret");
    expect(result).not.toHaveProperty("openId");
    expect(result).not.toHaveProperty("samlSubject");
  });

  it("removes active action tokens from process rows", () => {
    const result = omitSensitiveTransferFields({ id: 1, thesisRequestId: 2, actionToken: "secret", studentInviteToken: "invite", status: "pending" }, "pav_examiner_proposals");
    expect(result).toEqual({ id: 1, thesisRequestId: 2, status: "pending" });
  });

  it("accepts only the current versioned transfer manifest", () => {
    const manifest = createPortableTransferManifest({ sections: [], assets: [], exclusions: [], warnings: [] });
    expect(validatePortableTransferManifest(manifest)).toMatchObject({ valid: true });
    expect(validatePortableTransferManifest({ ...manifest, format: "other" })).toEqual({ valid: false, error: "Dieses Archiv gehört nicht zum Thesis Match Maker." });
    expect(manifest.format).toBe(PORTABLE_TRANSFER_FORMAT);
    expect(manifest.version).toBe(PORTABLE_TRANSFER_VERSION);
  });
});
