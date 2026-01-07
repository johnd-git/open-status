"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusResult } from "@/components/status-result";
import { SearchInput, type SearchResult } from "@/components/search-input";
import { StatusResponse } from "@/lib/types/status";
import { trackViewHours } from "@/lib/analytics";
import { MapPinIcon, ClockIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ChainCityPage() {
  const params = useParams();
  const router = useRouter();
  const chainSlug = params.chain as string;
  const cityState = params["city-state"] as string;

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert slug back to readable name
  const chainName = chainSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const cityParts = cityState?.split("-") || [];
  const stateCode = cityParts.pop()?.toUpperCase() || "";
  const city = cityParts.join("-");

  const cityFormatted = city
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  useEffect(() => {
    trackViewHours(chainSlug, cityFormatted);
    fetchStatus();
  }, [chainSlug, cityState]);

  async function geocodeCityState() {
    try {
      const query = `${cityFormatted}, ${stateCode}`;
      const response = await fetch(
        `/api/geocode?query=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error("Failed to geocode location");
      }

      const data = await response.json();
      return { lat: data.lat, lng: data.lng };
    } catch (err) {
      console.error("Geocoding error:", err);
      return null;
    }
  }

  async function fetchStatus() {
    setIsLoading(true);
    setError(null);

    try {
      const location = await geocodeCityState();

      if (!location) {
        throw new Error("Could not determine location for this city");
      }

      const params = new URLSearchParams({
        query: chainName,
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  }

  function handleNewSearch() {
    router.push("/");
  }

  function handleSearch(query: SearchResult) {
    router.push(`/${query.slug}/${cityState}`);
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
              <SearchInput
                onSearch={handleSearch}
                placeholder="Search any business..."
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <MapPinIcon className="w-4 h-4" />
                <span>
                  {cityFormatted}, {stateCode}
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          <StatusResult
            status={status}
            isLoading={isLoading}
            error={error}
            chainName={chainName}
            onNewSearch={handleNewSearch}
          />
        </div>
      </main>
    </div>
  );
}
