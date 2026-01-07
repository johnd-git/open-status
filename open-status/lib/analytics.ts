"use client";

import { track } from "@vercel/analytics";

export function trackEvent(eventName: string, props?: Record<string, string>) {
  try {
    if (typeof window !== "undefined") {
      track(eventName, props);
    }
  } catch (e) {
    // Silently fail - analytics should never break the app
    console.debug("Analytics error:", e);
  }
}

export function trackSearch(query: string) {
  trackEvent("search", { query });
}

export function trackLocationChange() {
  trackEvent("change_location");
}

export function trackViewHours(chainSlug: string, city: string) {
  trackEvent("view_hours", { chain: chainSlug, city });
}
