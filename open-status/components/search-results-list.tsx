"use client";

import { NearbyPlace } from "@/lib/types/status";
import { cn } from "@/lib/utils";
import { MapPinIcon, ChevronRightIcon } from "lucide-react";

interface SearchResultsListProps {
  results: NearbyPlace[];
  query: string;
  onSelect: (place: NearbyPlace) => void;
  isLoading?: boolean;
}

export function SearchResultsList({
  results,
  query,
  onSelect,
  isLoading,
}: SearchResultsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="text-center py-2">
          <p className="text-sm text-muted-foreground">
            Searching for &quot;{query}&quot; nearby...
          </p>
        </div>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
                <div className="h-4 bg-zinc-100 dark:bg-zinc-800/50 rounded w-full" />
              </div>
              <div className="ml-4 space-y-2 text-right">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-12 ml-auto" />
                <div className="h-3 bg-zinc-100 dark:bg-zinc-800/50 rounded w-8 ml-auto" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <MapPinIcon className="w-8 h-8 text-zinc-400" />
        </div>
        <h3 className="font-semibold text-lg mb-2">No results found</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          We couldn&apos;t find any &quot;{query}&quot; nearby. Try a different
          search term.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          {results.length} result{results.length !== 1 ? "s" : ""} for &quot;
          {query}&quot;
        </p>
      </div>

      <div className="space-y-2">
        {results.map((place, index) => (
          <button
            key={place.placeId}
            onClick={() => onSelect(place)}
            className={cn(
              "w-full p-4 rounded-2xl bg-white dark:bg-zinc-900 border text-left transition-all duration-200",
              "border-zinc-200/50 dark:border-zinc-800/50",
              "hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/5",
              "focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50",
              "group"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-4">
              {/* Status indicator */}
              <div
                className={cn(
                  "w-3 h-3 rounded-full flex-shrink-0",
                  place.isOpen === true && "bg-emerald-500",
                  place.isOpen === false && "bg-red-500",
                  place.isOpen === null && "bg-zinc-300 dark:bg-zinc-600"
                )}
              />

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {place.name}
                </h3>
                <p className="text-sm text-muted-foreground truncate">
                  {place.address}
                </p>
              </div>

              {/* Distance and status */}
              <div className="text-right flex-shrink-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    place.isOpen === true && "text-emerald-600 dark:text-emerald-400",
                    place.isOpen === false && "text-red-500",
                    place.isOpen === null && "text-muted-foreground"
                  )}
                >
                  {place.isOpen === true
                    ? "Open"
                    : place.isOpen === false
                      ? "Closed"
                      : "Hours N/A"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {place.distanceMiles < 0.1
                    ? "< 0.1 mi"
                    : `${place.distanceMiles.toFixed(1)} mi`}
                </p>
              </div>

              {/* Arrow */}
              <ChevronRightIcon className="w-5 h-5 text-zinc-300 dark:text-zinc-600 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

