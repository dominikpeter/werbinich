import type { MetadataRoute } from "next";

// installable web app: "Add to Home Screen" starts full screen, without the browser bar
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wer bin ich?",
    short_name: "Wer bin ich?",
    description: "Das Partyspiel, bei dem die KI mitspielt: fragen, raten, Jev rechnet mit.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c0b14",
    theme_color: "#0c0b14",
    lang: "de-CH",
    categories: ["games", "entertainment"],
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
