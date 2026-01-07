import { NextRequest, NextResponse } from "next/server";
import {
  StatusResponse,
  GooglePlaceDetails,
  GoogleNearbySearchResult,
} from "@/lib/types/status";
import {
  getCachedStatus,
  setCachedStatus,
  getCachedSearch,
  setCachedSearch,
} from "@/lib/cache";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

if (!GOOGLE_PLACES_API_KEY) {
  console.warn("GOOGLE_PLACES_API_KEY is not set");
}

// Calculate distance between two coordinates using Haversine formula
function getDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Normalize a string for fuzzy matching
function normalizeForMatching(str: string): string {
  return str
    .toLowerCase()
    .replace(/['']/g, "") // Remove apostrophes
    .replace(/[^a-z0-9\s]/g, "") // Remove special chars
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
}

// Check if a business name matches the search query
function nameMatchesQuery(name: string, query: string): boolean {
  const normalizedName = normalizeForMatching(name);
  const normalizedQuery = normalizeForMatching(query);

  // Direct inclusion check
  if (normalizedName.includes(normalizedQuery)) {
    return true;
  }

  // Check if all words in the query appear in the name
  const queryWords = normalizedQuery.split(" ").filter((w) => w.length > 2);
  const nameWords = normalizedName.split(" ");

  return queryWords.every((queryWord) =>
    nameWords.some(
      (nameWord) => nameWord.includes(queryWord) || queryWord.includes(nameWord)
    )
  );
}

async function searchNearbyPlace(
  query: string,
  lat: number,
  lng: number
): Promise<GoogleNearbySearchResult | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error("Google Places API key not configured");
  }

  // Use Text Search API for more flexible searching of any business
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/textsearch/json"
  );
  url.searchParams.set("key", GOOGLE_PLACES_API_KEY);
  url.searchParams.set("query", query);
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", "16000"); // 16km radius (10 miles)

  const response = await fetch(url.toString());

  if (!response.ok) {
    const error = await response.text();
    console.error("Text search error:", error);
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(`Google Places API error: ${data.status}`);
  }

  if (!data.results || data.results.length === 0) {
    return null;
  }

  interface PlaceResult {
    place_id: string;
    name: string;
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }

  // Filter results to only include places that actually match the query
  const matchingResults = (data.results as PlaceResult[]).filter((place) =>
    nameMatchesQuery(place.name, query)
  );

  if (matchingResults.length === 0) {
    console.log(
      `No matching results for "${query}". Got: ${data.results
        .slice(0, 5)
        .map((r: PlaceResult) => r.name)
        .join(", ")}`
    );
    return null;
  }

  // Sort matching results by distance to return the closest one
  const sortedResults = matchingResults.sort((a, b) => {
    const distA = getDistance(
      lat,
      lng,
      a.geometry.location.lat,
      a.geometry.location.lng
    );
    const distB = getDistance(
      lat,
      lng,
      b.geometry.location.lat,
      b.geometry.location.lng
    );
    return distA - distB;
  });

  const place = sortedResults[0];
  return {
    place_id: place.place_id,
    name: place.name,
    vicinity: place.formatted_address,
  };
}

async function getPlaceDetails(
  placeId: string
): Promise<GooglePlaceDetails | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    throw new Error("Google Places API key not configured");
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json"
  );
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
): Omit<
  StatusResponse,
  "placeName" | "address" | "placeId" | "timezone" | "businessStatus"
> {
  const openingHours = place.opening_hours;

  if (
    !openingHours ||
    !openingHours.weekday_text ||
    openingHours.weekday_text.length === 0
  ) {
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
    const currentTimeMinutes =
      currentTime.getHours() * 60 + currentTime.getMinutes();

    // Find today's period
    const todayPeriod = openingHours.periods.find(
      (p) => p.open.day === currentDay
    );

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
          const period = openingHours.periods.find(
            (p) => p.open.day === checkDay
          );
          if (period) {
            opensAt = formatTime(period.open.time);
            if (i > 1) {
              const dayNames = [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ];
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
    // Support both 'query' (new) and 'chain_slug' (legacy) params
    const query = searchParams.get("query") || searchParams.get("chain_slug");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!placeId && (!query || !lat || !lng)) {
      return NextResponse.json(
        { error: "Either place_id or query+lat+lng required" },
        { status: 400 }
      );
    }

    let finalPlaceId = placeId;
    let cacheHit = false;

    // If no place_id, search for nearby place first
    if (!finalPlaceId && query && lat && lng) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);

      // Check cache for search result
      const cachedSearch = await getCachedSearch(query, latNum, lngNum);
      if (cachedSearch) {
        finalPlaceId = cachedSearch.place_id;
        cacheHit = true;
      } else {
        const nearbyResult = await searchNearbyPlace(query, latNum, lngNum);
        if (!nearbyResult) {
          return NextResponse.json(
            { error: `No "${query}" found nearby` },
            { status: 404 }
          );
        }
        finalPlaceId = nearbyResult.place_id;
        // Cache the search result
        await setCachedSearch(query, latNum, lngNum, nearbyResult);
      }
    }

    if (!finalPlaceId) {
      return NextResponse.json({ error: "Place ID required" }, { status: 400 });
    }

    // Check cache for place details
    const cachedStatus = await getCachedStatus(finalPlaceId);
    let placeDetails: GooglePlaceDetails;

    if (cachedStatus) {
      placeDetails = cachedStatus;
      cacheHit = true;
    } else {
      const fetchedDetails = await getPlaceDetails(finalPlaceId);
      if (!fetchedDetails) {
        return NextResponse.json({ error: "Place not found" }, { status: 404 });
      }
      placeDetails = fetchedDetails;
      // Cache the place details
      await setCachedStatus(finalPlaceId, placeDetails);
    }

    // Parse opening hours
    const currentTime = new Date();
    const hoursData = parseOpeningHours(placeDetails, currentTime);

    // Determine timezone (default to UTC if not provided)
    // utc_offset is in seconds for the standard API
    const timezone = placeDetails.utc_offset
      ? `UTC${placeDetails.utc_offset >= 0 ? "+" : ""}${Math.floor(
          placeDetails.utc_offset / 3600
        )}`
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
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
