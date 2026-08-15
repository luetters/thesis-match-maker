import { describe, expect, it } from "vitest";
import { LANDING_HERO_MEDIA } from "../shared/landingHeroMedia";

describe("Landing-Page-Hero-Medien", () => {
  it("verwendet ein Web-bereitgestelltes MP4-Video und einen Bildfallback", () => {
    expect(LANDING_HERO_MEDIA.videoUrl).toMatch(/^\/manus-storage\/.+\.mp4$/);
    expect(LANDING_HERO_MEDIA.fallbackImageUrl).toMatch(/^\/manus-storage\/.+\.(jpg|jpeg|png|webp)$/);
    expect(LANDING_HERO_MEDIA.posterUrl).toBe(LANDING_HERO_MEDIA.fallbackImageUrl);
  });
});
