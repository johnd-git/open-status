"use client";

import { useState } from "react";
import { SearchInput, type SearchResult } from "@/components/search-input";
import { StatusResult } from "@/components/status-result";
import { SearchResultsList } from "@/components/search-results-list";
import { useGeolocation } from "@/hooks/use-geolocation";
import {
  StatusResponse,
  NearbyPlace,
  SearchResultsResponse,
} from "@/lib/types/status";
import { trackSearch } from "@/lib/analytics";
import { MapPinIcon, SearchIcon, ClockIcon, ArrowLeftIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type ViewState = "home" | "list" | "detail";

export default function HomePage() {
  const [viewState, setViewState] = useState<ViewState>("home");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<NearbyPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<NearbyPlace | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { location, isLoading: locationLoading } = useGeolocation();

  // Perform search when query changes
  async function performSearch(query: string) {
    if (!query || !location) return;

    setIsSearching(true);
    setError(null);
    setSearchResults([]);
    setViewState("list");
    trackSearch(query);

    try {
      const params = new URLSearchParams({
        query,
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        limit: "8",
      });

      const response = await fetch(`/api/search?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Search failed");
      }

      const data: SearchResultsResponse = await response.json();
      setSearchResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  }

  // Fetch details for a selected place
  async function fetchPlaceDetails(place: NearbyPlace) {
    setSelectedPlace(place);
    setIsLoadingDetails(true);
    setError(null);
    setViewState("detail");

    try {
      const params = new URLSearchParams({
        place_id: place.placeId,
      });

      const response = await fetch(`/api/status?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch details");
      }

      const data: StatusResponse = await response.json();
      setStatus(data);

      // Update URL without navigation
      const slug = place.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const cityState =
        location?.city && location?.state
          ? `${location.city
              .toLowerCase()
              .replace(/\s+/g, "-")}-${location.state.toLowerCase()}`
          : "nearby";
      const newUrl = `/${slug}/${cityState}`;
      window.history.replaceState(
        { ...window.history.state, as: newUrl, url: newUrl },
        "",
        newUrl
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load details");
      setStatus(null);
    } finally {
      setIsLoadingDetails(false);
    }
  }

  function handleSearch(result: SearchResult) {
    setSearchQuery(result.name);
    performSearch(result.name);
  }

  function handleBackToList() {
    setViewState("list");
    setSelectedPlace(null);
    setStatus(null);
    // Reset URL
    window.history.replaceState(
      { ...window.history.state, as: "/", url: "/" },
      "",
      "/"
    );
  }

  function handleNewSearch() {
    setViewState("home");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPlace(null);
    setStatus(null);
    setError(null);
    window.history.replaceState(
      { ...window.history.state, as: "/", url: "/" },
      "",
      "/"
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200/50 dark:border-zinc-800/50">
        <div className="container mx-auto px-4 py-3">
          {/* Top row: Logo + Location + Theme */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleNewSearch}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <ClockIcon className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg hidden sm:block">OpenNow</span>
            </button>

            {/* Desktop search - hidden on mobile */}
            <div className="hidden md:block flex-1 max-w-md">
              <SearchInput
                onSearch={handleSearch}
                placeholder="Search any business..."
              />
            </div>

            <div className="flex items-center gap-3">
              {location && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPinIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {location.city}, {location.state}
                  </span>
                </div>
              )}
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile search - below toolbar */}
          <div className="md:hidden mt-3">
            <SearchInput
              onSearch={handleSearch}
              placeholder="Search any business..."
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Home View - Landing */}
        {viewState === "home" && (
          <div className="max-w-2xl mx-auto text-center py-20">
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-6">
                <SearchIcon className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white bg-clip-text text-transparent">
                Is it open?
              </h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Search for any store, restaurant, or business to see what&apos;s
                open right now near you.
              </p>
            </div>

            {locationLoading && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span>Finding your location...</span>
              </div>
            )}

            {!locationLoading && !location && (
              <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 max-w-md mx-auto">
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  Enable location access to find businesses near you.
                </p>
              </div>
            )}

            {/* Popular searches */}
            {location && (
              <div className="mt-12">
                <p className="text-sm text-muted-foreground mb-4">
                  Popular searches
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    "Food",
                    "Coffee",
                    "Gas",
                    "Pharmacy",
                    "Grocery",
                    "Bank",
                    "Gym",
                    "Haircut",
                  ].map((name) => (
                    <button
                      key={name}
                      onClick={() => {
                        handleSearch({
                          name,
                          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                          placeType: "store",
                        });
                      }}
                      className="px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm font-medium transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* List View - Search Results */}
        {viewState === "list" && (
          <div className="max-w-lg mx-auto">
            <SearchResultsList
              results={searchResults}
              query={searchQuery}
              onSelect={fetchPlaceDetails}
              isLoading={isSearching}
            />

            {error && !isSearching && (
              <div className="mt-4 p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-center">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  {error}
                </p>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={handleNewSearch}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← New search
              </button>
            </div>
          </div>
        )}

        {/* Detail View - Place Details */}
        {viewState === "detail" && (
          <div className="max-w-lg mx-auto">
            {/* Back button */}
            {searchResults.length > 1 && (
              <button
                onClick={handleBackToList}
                className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back to results
              </button>
            )}

            <StatusResult
              status={status}
              isLoading={isLoadingDetails}
              error={error}
              chainName={selectedPlace?.name}
              onNewSearch={handleNewSearch}
            />
          </div>
        )}
      </main>
    </div>
  );
}
