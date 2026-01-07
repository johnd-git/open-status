"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChainAutocomplete, type Chain } from "@/components/chain-autocomplete";
import { StatusResult } from "@/components/status-result";
import { useGeolocation } from "@/hooks/use-geolocation";
import { StatusResponse } from "@/lib/types/status";
import { trackSearch, trackLocationChange } from "@/lib/analytics";
import { MapPinIcon, SearchIcon, ClockIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  const [selectedChain, setSelectedChain] = useState<Chain | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { location, isLoading: locationLoading } = useGeolocation();
  const router = useRouter();

  useEffect(() => {
    if (selectedChain && location) {
      trackSearch(selectedChain.slug);
      fetchStatus();
    }
  }, [selectedChain, location]);

  async function fetchStatus() {
    if (!selectedChain || !location) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        chain_slug: selectedChain.slug,
        lat: location.lat.toString(),
        lng: location.lng.toString(),
      });

      const response = await fetch(`/api/status?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch status");
      }

      const data: StatusResponse = await response.json();
      setStatus(data);

      // Update URL to SEO-friendly format
      const cityState =
        location.city && location.state
          ? `${location.city.toLowerCase().replace(/\s+/g, "-")}-${location.state.toLowerCase()}`
          : "unknown";
      router.push(`/${selectedChain.slug}/${cityState}`, { scroll: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }

  function handleNewSearch() {
    setSelectedChain(null);
    setStatus(null);
    setError(null);
    router.push("/", { scroll: false });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200/50 dark:border-zinc-800/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={handleNewSearch}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <ClockIcon className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg hidden sm:block">OpenNow</span>
            </button>

            <div className="flex-1 max-w-md">
              <ChainAutocomplete
                onSelect={setSelectedChain}
                selectedChain={selectedChain}
                placeholder="Search stores & restaurants..."
              />
            </div>

            <div className="flex items-center gap-3">
              {location && (
                <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPinIcon className="w-4 h-4" />
                  <span>
                    {location.city}, {location.state}
                  </span>
                </div>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {!selectedChain && !status && (
          <div className="max-w-2xl mx-auto text-center py-20">
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-6">
                <SearchIcon className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-white dark:via-zinc-300 dark:to-white bg-clip-text text-transparent">
                Is it open?
              </h1>
              <p className="text-lg text-muted-foreground max-w-md mx-auto">
                Instantly check if your favorite stores and restaurants are open
                right now, near you.
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
                  Enable location access to find stores near you, or search by
                  name above.
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
                  {["Target", "Starbucks", "CVS", "Walmart", "Costco"].map(
                    (name) => (
                      <button
                        key={name}
                        onClick={() => {
                          const chain = {
                            name,
                            slug: name.toLowerCase(),
                            placeType: "store",
                          };
                          setSelectedChain(chain);
                        }}
                        className="px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm font-medium transition-colors"
                      >
                        {name}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {(selectedChain || status || isLoading || error) && (
          <div className="max-w-lg mx-auto">
            <StatusResult
              status={status}
              isLoading={isLoading}
              error={error}
              chainName={selectedChain?.name}
              onNewSearch={handleNewSearch}
            />
          </div>
        )}
      </main>
    </div>
  );
}
