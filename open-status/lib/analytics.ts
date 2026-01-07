"use client";

import { track } from "@vercel/analytics";

export function trackEvent(eventName: string, props?: Record<string, string>) {
  if (typeof window !== "undefined") {
    track(eventName, props);
  }
}

export function trackSearch(chainSlug: string) {
  trackEvent("search_chain", { chain: chainSlug });
}

export function trackLocationChange() {
  trackEvent("change_location");
}

export function trackViewHours(chainSlug: string, city: string) {
  trackEvent("view_hours", { chain: chainSlug, city });
}
