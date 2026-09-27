import type { CapacitorConfig } from "@capacitor/cli";

// The phone apps are a native shell around the website: every web release reaches them without a store update.
// native-shell/ only holds the page shown when the phone is offline.
const config: CapacitorConfig = {
  appId: "ai.werbinich.app",
  appName: "Wer bin ich?",
  webDir: "native-shell",
  server: { url: "https://werbinich-psi.vercel.app", errorPath: "offline.html" },
  plugins: {
    SplashScreen: { launchShowDuration: 600, backgroundColor: "#0b0a12", showSpinner: false },
  },
  ios: { backgroundColor: "#0b0a12", contentInset: "never" },
};

export default config;
