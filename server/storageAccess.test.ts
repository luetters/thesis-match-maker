import { describe, expect, it } from "vitest";
import { isPrivateStorageKey } from "./_core/storageProxy";
import { isPrivateThesisStorageKey } from "./uploadRoutes";

describe("Private Speicherobjekte", () => {
  it("stuft Exposés und bedingte Dokumente in beiden Abrufwegen als privat ein", () => {
    for (const key of ["exposes/expose-1.pdf", "conditional-docs/conditional-1.pdf"]) {
      expect(isPrivateStorageKey(key)).toBe(true);
      expect(isPrivateThesisStorageKey(key)).toBe(true);
    }
  });

  it("belässt öffentliche Medien außerhalb der privaten Fachaktenpfade", () => {
    expect(isPrivateStorageKey("avatars/user-1.jpg")).toBe(false);
    expect(isPrivateThesisStorageKey("banners/user-1.jpg")).toBe(false);
  });
});
