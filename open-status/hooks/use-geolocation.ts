"use client";

import { useState, useEffect, useCallback } from "react";

interface Location {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  accuracy?: number; // meters
}

interface StoredLocation {
  location: Location;
  timestamp: number;
}

interface UseGeolocationReturn {
  location: Location | null;
  error: string | null;
  isLoading: boolean;
  state: "idle" | "loading" | "success" | "denied" | "error";
  refetch: () => void;
}

const STORAGE_KEY = "open-status-location-v2";
const GEOLOCATION_TIMEOUT = 15000; // 15 seconds for high-accuracy GPS
const CACHE_DURATION = 300000; // 5 minutes cache for location with city/state

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
        const data: StoredLocation = JSON.parse(stored);
        // Check if cached location is still fresh
        if (data.timestamp && Date.now() - data.timestamp < CACHE_DURATION) {
          return data.location;
        }
      }
    } catch (e) {
      console.error("Failed to read location from localStorage", e);
    }
    return null;
  }, []);

  const saveLocationToStorage = useCallback((loc: Location) => {
    if (typeof window === "undefined") return;
    try {
      const data: StoredLocation = {
        location: loc,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save location to localStorage", e);
    }
  }, []);

  // Reverse geocode coordinates to get city/state
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<{ city?: string; state?: string }> => {
    try {
      const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
      if (response.ok) {
        const data = await response.json();
        return { city: data.city, state: data.state };
      }
    } catch (e) {
      console.warn("Reverse geocoding failed:", e);
    }
    return {};
  }, []);

  const getLocationFromIP = useCallback(async (): Promise<Location | null> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("https://ipapi.co/json/", {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.status === 429) {
        console.warn("IP geolocation rate limited, skipping");
        return null;
      }

      if (!response.ok) {
        console.warn(`IP geolocation failed with status ${response.status}`);
        return null;
      }

      const data = await response.json();

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
    if (cached && cached.city) {
      setLocation(cached);
      setState("success");
      setIsLoading(false);
      return;
    }

    // Try HTML5 Geolocation with HIGH ACCURACY
    if (navigator.geolocation) {
      const geoPromise = new Promise<{ lat: number; lng: number; accuracy: number } | null>((resolve) => {
        const timeoutId = setTimeout(() => {
          console.warn("High-accuracy geolocation timed out");
          resolve(null);
        }, GEOLOCATION_TIMEOUT);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId);
            console.log(`GPS accuracy: ${position.coords.accuracy}m`);
            resolve({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
          },
          (err) => {
            clearTimeout(timeoutId);
            console.warn("Geolocation error:", err.message);
            if (err.code === err.PERMISSION_DENIED) {
              setState("denied");
            }
            resolve(null);
          },
          {
            enableHighAccuracy: true,
            timeout: GEOLOCATION_TIMEOUT,
            maximumAge: 0,
          }
        );
      });

      const geoResult = await geoPromise;
      if (geoResult) {
        // Got GPS coordinates, now reverse geocode to get city/state
        const { city, state: stateCode } = await reverseGeocode(geoResult.lat, geoResult.lng);
        
        const fullLocation: Location = {
          lat: geoResult.lat,
          lng: geoResult.lng,
          accuracy: geoResult.accuracy,
          city,
          state: stateCode,
        };

        saveLocationToStorage(fullLocation);
        setLocation(fullLocation);
        setState("success");
        setIsLoading(false);
        return;
      }
    }

    // Fallback to IP-based location (already includes city/state)
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
  }, [getLocationFromStorage, saveLocationToStorage, getLocationFromIP, reverseGeocode]);

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
