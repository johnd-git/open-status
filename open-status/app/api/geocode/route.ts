import { NextRequest, NextResponse } from "next/server";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const zip = searchParams.get("zip");
    const query = searchParams.get("query") || zip;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!GOOGLE_PLACES_API_KEY) {
      return NextResponse.json(
        { error: "Google Places API key not configured" },
        { status: 500 }
      );
    }

    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("key", GOOGLE_PLACES_API_KEY);

    // Reverse geocoding: lat/lng to address
    if (lat && lng) {
      url.searchParams.set("latlng", `${lat},${lng}`);
    } 
    // Forward geocoding: address to lat/lng
    else if (query) {
      url.searchParams.set("address", query);
    } else {
      return NextResponse.json(
        { error: "Location query or coordinates required" },
        { status: 400 }
      );
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const result = data.results[0];
    const location = result.geometry.location;

    // Extract city and state from address components
    let city = "";
    let state = "";

    for (const component of result.address_components) {
      // City can be in locality, sublocality, or neighborhood
      if (!city && component.types.includes("locality")) {
        city = component.long_name;
      }
      if (!city && component.types.includes("sublocality_level_1")) {
        city = component.long_name;
      }
      if (!city && component.types.includes("neighborhood")) {
        city = component.long_name;
      }
      // State/province
      if (component.types.includes("administrative_area_level_1")) {
        state = component.short_name;
      }
    }

    return NextResponse.json({
      lat: location.lat,
      lng: location.lng,
      city,
      state,
      formatted_address: result.formatted_address,
    });
  } catch (error) {
    console.error("Geocode API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
