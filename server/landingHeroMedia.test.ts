import { describe, expect, it } from "vitest";
import { getNextLandingBackgroundVideoIndex, LANDING_BACKGROUND_VIDEOS, LANDING_HERO_MEDIA } from "../shared/landingHeroMedia";

describe("Landing-Page-Hero-Medien", () => {
  it("verwendet ein Web-bereitgestelltes MP4-Video und einen Bildfallback", () => {
    expect(LANDING_HERO_MEDIA.videoUrl).toMatch(/^\/manus-storage\/.+\.mp4$/);
    expect(LANDING_HERO_MEDIA.fallbackImageUrl).toMatch(/^\/manus-storage\/.+\.(jpg|jpeg|png|webp)$/);
    expect(LANDING_HERO_MEDIA.posterUrl).toBe(LANDING_HERO_MEDIA.fallbackImageUrl);
  });

  it("stellt fünf unterschiedliche Hintergrundvideos als Kreislauf bereit", () => {
    expect(LANDING_BACKGROUND_VIDEOS).toHaveLength(5);
    expect(new Set(LANDING_BACKGROUND_VIDEOS.map((video) => video.url)).size).toBe(5);
    expect(getNextLandingBackgroundVideoIndex(4)).toBe(0);
    expect(getNextLandingBackgroundVideoIndex(1)).toBe(2);
  });
});
