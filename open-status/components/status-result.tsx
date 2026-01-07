"use client";

import { useState } from "react";
import { StatusResponse } from "@/lib/types/status";
import {
  ChevronDownIcon,
  MapPinIcon,
  ClockIcon,
  ExternalLinkIcon,
  SearchIcon,
  AlertCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CountdownTimer } from "@/components/countdown-timer";

interface StatusResultProps {
  status: StatusResponse | null;
  isLoading?: boolean;
  error?: string | null;
  chainName?: string;
  onNewSearch?: () => void;
}

export function StatusResult({
  status,
  isLoading,
  error,
  chainName,
  onNewSearch,
}: StatusResultProps) {
  const [showHours, setShowHours] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-xl shadow-zinc-200/50 dark:shadow-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
          <div className="flex flex-col items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            <div className="space-y-3 w-full max-w-xs">
              <div className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
              <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse w-2/3 mx-auto" />
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Finding {chainName || "store"} near you...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-xl shadow-zinc-200/50 dark:shadow-zinc-900/50 border border-red-200/50 dark:border-red-900/50">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
            <AlertCircleIcon className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-1">Couldn&apos;t find it</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <button
            onClick={onNewSearch}
            className="mt-2 px-6 py-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-sm font-medium transition-colors flex items-center gap-2"
          >
            <SearchIcon className="w-4 h-4" />
            Try another search
          </button>
        </div>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const isOpen = status.openNow;

  return (
    <div className="space-y-4">
      {/* Main Status Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-xl shadow-zinc-200/50 dark:shadow-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50">
        {/* Status Header */}
        <div
          className={cn(
            "p-8 text-center text-white",
            isOpen
              ? "bg-gradient-to-br from-emerald-400 to-emerald-600"
              : "bg-gradient-to-br from-red-400 to-red-600"
          )}
        >
          <div className="mb-4">
            <span
              className={cn(
                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium",
                isOpen
                  ? "bg-white/20 backdrop-blur"
                  : "bg-white/20 backdrop-blur"
              )}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  isOpen ? "bg-white animate-pulse" : "bg-white"
                )}
              />
              {isOpen ? "Open Now" : "Closed"}
            </span>
          </div>

          <h2 className="text-3xl font-bold mb-2">{status.placeName}</h2>

          {isOpen && status.closesAt && (
            <p className="text-white/90 text-lg">
              until {status.closesAt}{" "}
              <span className="text-white/70">
                (<CountdownTimer targetTime={status.closesAt} />)
              </span>
            </p>
          )}

          {!isOpen && status.opensAt && (
            <p className="text-white/90 text-lg">Opens {status.opensAt}</p>
          )}
        </div>

        {/* Details */}
        <div className="p-6 space-y-4">
          {/* Address */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
              <MapPinIcon className="w-5 h-5 text-zinc-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Address</p>
              <p className="font-medium">{status.address}</p>
            </div>
          </div>

          {/* Hours Toggle */}
          {status.weekdayText && status.weekdayText.length > 0 && (
            <div>
              <button
                onClick={() => setShowHours(!showHours)}
                className="w-full flex items-center gap-3 p-3 -mx-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <ClockIcon className="w-5 h-5 text-zinc-500" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm text-muted-foreground">Hours</p>
                  <p className="font-medium">View weekly schedule</p>
                </div>
                <ChevronDownIcon
                  className={cn(
                    "w-5 h-5 text-zinc-400 transition-transform duration-200",
                    showHours && "rotate-180"
                  )}
                />
              </button>

              {showHours && (
                <div className="mt-2 ml-13 pl-13 space-y-2 border-l-2 border-zinc-100 dark:border-zinc-800 ml-5 pl-8">
                  {status.weekdayText.map((day, index) => (
                    <p key={index} className="text-sm py-1">
                      {day}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Maps Link */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(status.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 -mx-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center flex-shrink-0">
              <ExternalLinkIcon className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-blue-600 dark:text-blue-400 group-hover:underline">
                Get directions
              </p>
              <p className="text-sm text-muted-foreground">Open in Google Maps</p>
            </div>
          </a>
        </div>
      </div>

      {/* New Search Button */}
      <div className="text-center">
        <button
          onClick={onNewSearch}
          className="px-6 py-3 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-sm font-medium transition-colors shadow-lg"
        >
          Search for something else
        </button>
      </div>
    </div>
  );
}

