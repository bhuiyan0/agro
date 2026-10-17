import type { CapacitorConfig } from "@capacitor/cli";

// The Android test APK: the static export (`out/`, built with
// NEXT_PUBLIC_APK=1) inside a WebView, demo mode only, no server.
const config: CapacitorConfig = {
  appId: "bd.greenhill.demo",
  appName: "গ্রিন হিল (ডেমো)",
  webDir: "out",
};

export default config;
