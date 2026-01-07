"use client";

import { useState, useEffect, useCallback } from "react";

interface Location {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
}

interface UseGeolocationReturn {
  location: Location | null;
  error: string | null;
  isLoading: boolean;
  state: "idle" | "loading" | "success" | "denied" | "error";
  refetch: () => void;
}

const STORAGE_KEY = "open-status-location";
const GEOLOCATION_TIMEOUT = 5000;

export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [state, setState] = useState<"idle" | "loading" | "success" | "denied" | "error">("idle");

  const getLocationFromStorage = useCallback((): Location | null => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to read location from localStorage", e);
    }
    return null;
  }, []);

  const saveLocationToStorage = useCallback((loc: Location) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    } catch (e) {
      console.error("Failed to save location to localStorage", e);
    }
  }, []);

  const getLocationFromIP = useCallback(async (): Promise<Location | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("https://ipapi.co/json/", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Handle rate limiting (429) and other errors gracefully
      if (response.status === 429) {
        console.warn("IP geolocation rate limited, skipping");
        return null;
      }

      if (!response.ok) {
        console.warn(`IP geolocation failed with status ${response.status}`);
        return null;
      }

      const data = await response.json();

      // Check for error response from ipapi
      if (data.error) {
        console.warn("IP geolocation error:", data.reason || data.error);
        return null;
      }

      if (data.latitude && data.longitude) {
        return {
          lat: data.latitude,
          lng: data.longitude,
          city: data.city,
          state: data.region_code,
        };
      }
    } catch (e) {
      // Handle abort and network errors silently
      if (e instanceof Error && e.name === "AbortError") {
        console.warn("IP geolocation request timed out");
      } else {
        console.warn("IP geolocation error:", e);
      }
    }
    return null;
  }, []);

  const fetchLocation = useCallback(async () => {
    setState("loading");
    setIsLoading(true);
    setError(null);

    // Check localStorage first
    const cached = getLocationFromStorage();
    if (cached) {
      setLocation(cached);
      setState("success");
      setIsLoading(false);
      return;
    }

    // Try HTML5 Geolocation
    if (navigator.geolocation) {
      const geoPromise = new Promise<Location | null>((resolve) => {
        const timeoutId = setTimeout(() => {
          resolve(null);
        }, GEOLOCATION_TIMEOUT);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId);
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          },
          (err) => {
            clearTimeout(timeoutId);
            if (err.code === err.PERMISSION_DENIED) {
              setState("denied");
            } else {
              setState("error");
            }
            resolve(null);
          },
          {
            enableHighAccuracy: false,
            timeout: GEOLOCATION_TIMEOUT,
            maximumAge: 300000, // 5 minutes
          }
        );
      });

      const geoLocation = await geoPromise;
      if (geoLocation) {
        saveLocationToStorage(geoLocation);
        setLocation(geoLocation);
        setState("success");
        setIsLoading(false);
        return;
      }
    }

    // Fallback to IP-based location
    const ipLocation = await getLocationFromIP();
    if (ipLocation) {
      saveLocationToStorage(ipLocation);
      setLocation(ipLocation);
      setState("success");
    } else {
      setError("Unable to determine your location");
      setState("error");
    }
    setIsLoading(false);
  }, [getLocationFromStorage, saveLocationToStorage, getLocationFromIP]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return {
    location,
    error,
    isLoading,
    state,
    refetch: fetchLocation,
  };
}

