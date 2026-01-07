import { NextRequest, NextResponse } from "next/server";
import { StatusResponse, GooglePlaceDetails, GoogleNearbySearchResult } from "@/lib/types/status";
import { getCachedStatus, setCachedStatus, getCachedSearch, setCachedSearch } from "@/lib/cache";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
  console.warn("GOOGLE_PLACES_API_KEY is not set");
}

async function searchNearbyPlace(
  chainName: string,
  lat: number,
  lng: number
): Promise<GoogleNearbySearchResult | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error("Google Places API key not configured");
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
  url.searchParams.set("key", GOOGLE_PLACES_API_KEY);
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", "5000");
  url.searchParams.set("keyword", chainName);
  url.searchParams.set("type", "store");

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.text();
    console.error("Nearby search error:", error);
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places API error: ${data.status}`);
  }

  if (!data.results || data.results.length === 0) {
    return null;
  }

  const place = data.results[0];
  return {
    place_id: place.place_id,
    name: place.name,
    vicinity: place.vicinity,
  };
}

async function getPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error("Google Places API key not configured");
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("key", GOOGLE_PLACES_API_KEY);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set(
    "fields",
    "place_id,name,formatted_address,opening_hours,utc_offset,business_status"
  );

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.text();
    console.error("Place details error:", error);
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "OK") {
    throw new Error(`Google Places API error: ${data.status}`);
  }

  return data.result as GooglePlaceDetails;
}

function formatTime(timeString: string): string {
  // Convert "HHMM" format to "H:MM AM/PM"
  if (!timeString || timeString.length < 4) return "";
  const hours = parseInt(timeString.substring(0, 2), 10);
  const minutes = timeString.substring(2, 4);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${minutes} ${period}`;
}

function parseOpeningHours(
  place: GooglePlaceDetails,
  currentTime: Date
): Omit<StatusResponse, "placeName" | "address" | "placeId" | "timezone" | "businessStatus"> {
  const openingHours = place.opening_hours;

  if (!openingHours || !openingHours.weekday_text || openingHours.weekday_text.length === 0) {
    return {
      isOpen: false,
      openNow: false,
      weekdayText: [],
    };
  }

  const weekdayText = openingHours.weekday_text;
  const openNow = openingHours.open_now || false;

  // Calculate next close/open times from weekday_text
  let closesAt: string | undefined;
  let opensAt: string | undefined;

  if (openingHours.periods && openingHours.periods.length > 0) {
    const currentDay = currentTime.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTimeMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    // Find today's period
    const todayPeriod = openingHours.periods.find((p) => p.open.day === currentDay);

    if (todayPeriod && todayPeriod.close) {
      const closeTimeStr = todayPeriod.close.time;
      const closeTime = parseInt(closeTimeStr, 10);
      const closeHours = Math.floor(closeTime / 100);
      const closeMinutes = closeTime % 100;
      const closeTimeMinutes = closeHours * 60 + closeMinutes;

      if (openNow && closeTimeMinutes > currentTimeMinutes) {
        closesAt = formatTime(closeTimeStr);
      }
    }

    // Find next open period
    if (!openNow) {
      // Check today first
      if (todayPeriod) {
        const openTimeStr = todayPeriod.open.time;
        const openTime = parseInt(openTimeStr, 10);
        const openHours = Math.floor(openTime / 100);
        const openMinutes = openTime % 100;
        const openTimeMinutes = openHours * 60 + openMinutes;

        if (openTimeMinutes > currentTimeMinutes) {
          opensAt = formatTime(openTimeStr);
        }
      }

      // If not found, check next days
      if (!opensAt) {
        for (let i = 1; i <= 7; i++) {
          const checkDay = (currentDay + i) % 7;
          const period = openingHours.periods.find((p) => p.open.day === checkDay);
          if (period) {
            opensAt = formatTime(period.open.time);
            if (i > 1) {
              const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
              opensAt = `${opensAt} ${dayNames[checkDay]}`;
            } else {
              opensAt = `${opensAt} tomorrow`;
            }
            break;
          }
        }
      }
    }
  }

  return {
    isOpen: openNow,
    openNow,
    closesAt,
    opensAt,
    weekdayText,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const placeId = searchParams.get("place_id");
    const chainSlug = searchParams.get("chain_slug");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!placeId && (!chainSlug || !lat || !lng)) {
      return NextResponse.json(
        { error: "Either place_id or chain_slug+lat+lng required" },
        { status: 400 }
      );
    }

    let finalPlaceId = placeId;
    let cacheHit = false;

    // If no place_id, search for nearby place first
    if (!finalPlaceId && chainSlug && lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);

      // Check cache for search result
      const cachedSearch = await getCachedSearch(chainSlug, latNum, lngNum);
      if (cachedSearch) {
        finalPlaceId = cachedSearch.place_id;
        cacheHit = true;
      } else {
        const nearbyResult = await searchNearbyPlace(chainSlug, latNum, lngNum);
        if (!nearbyResult) {
          return NextResponse.json(
            { error: "No nearby location found for this chain" },
            { status: 404 }
          );
        }
        finalPlaceId = nearbyResult.place_id;
        // Cache the search result
        await setCachedSearch(chainSlug, latNum, lngNum, nearbyResult);
      }
    }

    if (!finalPlaceId) {
      return NextResponse.json({ error: "Place ID required" }, { status: 400 });
    }

    // Check cache for place details
    let placeDetails: GooglePlaceDetails | null = null;
    const cachedStatus = await getCachedStatus(finalPlaceId);
    if (cachedStatus) {
      placeDetails = cachedStatus;
      cacheHit = true;
    } else {
      placeDetails = await getPlaceDetails(finalPlaceId);
      if (!placeDetails) {
        return NextResponse.json({ error: "Place not found" }, { status: 404 });
      }
      // Cache the place details
      await setCachedStatus(finalPlaceId, placeDetails);
    }

    // Parse opening hours
    const currentTime = new Date();
    const hoursData = parseOpeningHours(placeDetails, currentTime);

    // Determine timezone (default to UTC if not provided)
    // utc_offset is in seconds for the standard API
    const timezone = placeDetails.utc_offset
      ? `UTC${placeDetails.utc_offset >= 0 ? "+" : ""}${Math.floor(placeDetails.utc_offset / 3600)}`
      : "UTC";

    const response: StatusResponse = {
      ...hoursData,
      timezone,
      businessStatus: placeDetails.business_status || "OPERATIONAL",
      placeName: placeDetails.name,
      address: placeDetails.formatted_address,
      placeId: placeDetails.place_id,
    };

    const headers = new Headers();
    headers.set("X-Cache", cacheHit ? "HIT" : "MISS");

    return NextResponse.json(response, { headers });
  } catch (error) {
    console.error("Status API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

