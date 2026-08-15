export const LANDING_HERO_MEDIA = {
  videoUrl: "/manus-storage/InfrarotinBibliothek_458a4f63.mp4",
  fallbackImageUrl: "/manus-storage/htw-banner_7aece4c8.jpg",
  posterUrl: "/manus-storage/htw-banner_7aece4c8.jpg",
} as const;

export const LANDING_BACKGROUND_VIDEOS = [
  { url: "/manus-storage/doppelhelix_11919ca4.mp4", label: "Doppelhelix" },
  { url: "/manus-storage/zahnrad_5a03ea50.mp4", label: "Zahnrad" },
  { url: "/manus-storage/Riesenrad_ad8a7edc.mp4", label: "Riesenrad" },
  { url: "/manus-storage/Zellen_a463c072.mp4", label: "Zellen" },
  { url: "/manus-storage/blossom_ceaee23f.mp4", label: "Blossom" },
] as const;

export function getNextLandingBackgroundVideoIndex(currentIndex: number): number {
  return (currentIndex + 1) % LANDING_BACKGROUND_VIDEOS.length;
}
