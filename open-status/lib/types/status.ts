export interface StatusResponse {
  isOpen: boolean;
  openNow: boolean;
  closesAt?: string; // "9:30 PM"
  opensAt?: string; // "7:00 AM tomorrow"
  weekdayText: string[];
  timezone: string;
  businessStatus: string;
  placeName: string;
  address: string;
  placeId: string;
}

export interface GooglePlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  utc_offset?: number;
  business_status?: string;
}

export interface GoogleNearbySearchResult {
  place_id: string;
  name: string;
  vicinity?: string;
}

