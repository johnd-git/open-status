import { NextRequest, NextResponse } from "next/server";
import { NearbyPlace, SearchResultsResponse } from "@/lib/types/status";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Generic term mappings - maps casual/generic terms to better search queries
// Format: { term: { query: "enhanced query", type?: "google_place_type" } }
const GENERIC_TERM_MAP: Record<string, { query: string; type?: string }> = {
  // Food & Dining
  food: { query: "restaurant", type: "restaurant" },
  eat: { query: "restaurant", type: "restaurant" },
  eating: { query: "restaurant", type: "restaurant" },
  restaurant: { query: "restaurant", type: "restaurant" },
  restaurants: { query: "restaurant", type: "restaurant" },
  dinner: { query: "restaurant", type: "restaurant" },
  lunch: { query: "restaurant", type: "restaurant" },
  breakfast: { query: "breakfast restaurant" },
  brunch: { query: "brunch restaurant" },
  pizza: { query: "pizza restaurant" },
  burgers: { query: "burger restaurant" },
  sushi: { query: "sushi restaurant" },
  mexican: { query: "mexican restaurant" },
  chinese: { query: "chinese restaurant" },
  italian: { query: "italian restaurant" },
  thai: { query: "thai restaurant" },
  indian: { query: "indian restaurant" },
  "fast food": { query: "fast food restaurant", type: "restaurant" },
  fastfood: { query: "fast food restaurant", type: "restaurant" },
  
  // Coffee & Drinks
  coffee: { query: "coffee shop", type: "cafe" },
  cafe: { query: "cafe", type: "cafe" },
  tea: { query: "tea shop", type: "cafe" },
  boba: { query: "boba tea shop" },
  drinks: { query: "bar", type: "bar" },
  bar: { query: "bar", type: "bar" },
  bars: { query: "bar", type: "bar" },
  beer: { query: "bar", type: "bar" },
  
  // Gas & Auto
  gas: { query: "gas station", type: "gas_station" },
  fuel: { query: "gas station", type: "gas_station" },
  gasoline: { query: "gas station", type: "gas_station" },
  petrol: { query: "gas station", type: "gas_station" },
  "gas station": { query: "gas station", type: "gas_station" },
  carwash: { query: "car wash", type: "car_wash" },
  "car wash": { query: "car wash", type: "car_wash" },
  mechanic: { query: "auto repair", type: "car_repair" },
  "auto repair": { query: "auto repair", type: "car_repair" },
  tires: { query: "tire shop" },
  
  // Shopping
  grocery: { query: "grocery store", type: "supermarket" },
  groceries: { query: "grocery store", type: "supermarket" },
  supermarket: { query: "supermarket", type: "supermarket" },
  store: { query: "store" },
  shopping: { query: "shopping mall", type: "shopping_mall" },
  mall: { query: "shopping mall", type: "shopping_mall" },
  clothes: { query: "clothing store", type: "clothing_store" },
  clothing: { query: "clothing store", type: "clothing_store" },
  shoes: { query: "shoe store", type: "shoe_store" },
  electronics: { query: "electronics store", type: "electronics_store" },
  hardware: { query: "hardware store", type: "hardware_store" },
  
  // Health & Pharmacy
  pharmacy: { query: "pharmacy", type: "pharmacy" },
  drugstore: { query: "pharmacy", type: "pharmacy" },
  medicine: { query: "pharmacy", type: "pharmacy" },
  doctor: { query: "doctor", type: "doctor" },
  hospital: { query: "hospital", type: "hospital" },
  urgent: { query: "urgent care" },
  "urgent care": { query: "urgent care" },
  dentist: { query: "dentist", type: "dentist" },
  gym: { query: "gym", type: "gym" },
  fitness: { query: "gym", type: "gym" },
  
  // Financial
  bank: { query: "bank", type: "bank" },
  atm: { query: "atm", type: "atm" },
  
  // Services
  haircut: { query: "hair salon", type: "hair_care" },
  salon: { query: "hair salon", type: "hair_care" },
  "hair salon": { query: "hair salon", type: "hair_care" },
  barber: { query: "barber shop", type: "hair_care" },
  nails: { query: "nail salon" },
  spa: { query: "spa", type: "spa" },
  laundry: { query: "laundromat", type: "laundry" },
  laundromat: { query: "laundromat", type: "laundry" },
  "dry cleaning": { query: "dry cleaner" },
  "dry cleaner": { query: "dry cleaner" },
  
  // Entertainment
  movies: { query: "movie theater", type: "movie_theater" },
  theater: { query: "movie theater", type: "movie_theater" },
  cinema: { query: "movie theater", type: "movie_theater" },
  bowling: { query: "bowling alley", type: "bowling_alley" },
  
  // Convenience
  convenience: { query: "convenience store", type: "convenience_store" },
  "convenience store": { query: "convenience store", type: "convenience_store" },
  liquor: { query: "liquor store", type: "liquor_store" },
  "liquor store": { query: "liquor store", type: "liquor_store" },
  
  // Other
  hotel: { query: "hotel", type: "lodging" },
  hotels: { query: "hotel", type: "lodging" },
  parking: { query: "parking", type: "parking" },
  post: { query: "post office", type: "post_office" },
  "post office": { query: "post office", type: "post_office" },
  library: { query: "library", type: "library" },
};

// Check if query is a generic term and return enhanced search params
function getEnhancedSearch(query: string): { query: string; type?: string } | null {
  const normalized = query.toLowerCase().trim();
  
  // Direct match
  if (GENERIC_TERM_MAP[normalized]) {
    return GENERIC_TERM_MAP[normalized];
  }
  
  // Check for "nearby" suffix (e.g., "food nearby", "gas nearby")
  const withoutNearby = normalized.replace(/\s*(near\s*me|nearby|near\s*by|close\s*by)\s*$/i, "").trim();
  if (withoutNearby !== normalized && GENERIC_TERM_MAP[withoutNearby]) {
    return GENERIC_TERM_MAP[withoutNearby];
  }
  
  return null;
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

interface GoogleTextSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now?: boolean;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const limitParam = searchParams.get("limit");

    if (!query || !lat || !lng) {
      return NextResponse.json(
        { error: "query, lat, and lng are required" },
        { status: 400 }
      );
    }

    if (!GOOGLE_PLACES_API_KEY) {
      return NextResponse.json(
        { error: "Google Places API key not configured" },
        { status: 500 }
      );
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const limit = limitParam ? parseInt(limitParam, 10) : 6;

    // Check if this is a generic term that should be enhanced
    const enhanced = getEnhancedSearch(query);
    const searchQuery = enhanced?.query || query;
    const placeType = enhanced?.type;

    console.log(`Search: "${query}" → "${searchQuery}"${placeType ? ` (type: ${placeType})` : ""}`);

    // Use Text Search API for flexible searching
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/textsearch/json"
    );
    url.searchParams.set("key", GOOGLE_PLACES_API_KEY);
    url.searchParams.set("query", searchQuery);
    url.searchParams.set("location", `${latNum},${lngNum}`);
    url.searchParams.set("radius", "16000"); // 16km radius (10 miles)
    
    // Add type filter for generic category searches
    if (placeType) {
      url.searchParams.set("type", placeType);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error = await response.text();
      console.error("Text search error:", error);
      return NextResponse.json(
        { error: `Google Places API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
      return NextResponse.json(
        { error: `Google Places API error: ${data.status}` },
        { status: 500 }
      );
    }

    if (!data.results || data.results.length === 0) {
      const emptyResponse: SearchResultsResponse = {
        results: [],
        query,
      };
      return NextResponse.json(emptyResponse);
    }

    // Map and sort results by distance
    const results: NearbyPlace[] = (data.results as GoogleTextSearchResult[])
      .map((place) => {
        const distanceKm = getDistance(
          latNum,
          lngNum,
          place.geometry.location.lat,
          place.geometry.location.lng
        );
        return {
          placeId: place.place_id,
          name: place.name,
          address: place.formatted_address,
          distance: Math.round(distanceKm * 100) / 100,
          distanceMiles: Math.round(distanceKm * 0.621371 * 100) / 100,
          isOpen: place.opening_hours?.open_now ?? null,
        };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    const searchResponse: SearchResultsResponse = {
      results,
      query,
    };

    return NextResponse.json(searchResponse);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

