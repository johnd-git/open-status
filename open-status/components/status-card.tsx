"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { StatusResponse } from "@/lib/types/status";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LocationModal } from "@/components/location-modal";

interface StatusCardProps {
  status: StatusResponse | null;
  isLoading?: boolean;
  className?: string;
  currentLocation?: { lat: number; lng: number; city?: string; state?: string } | null;
  onLocationChange?: () => void;
}

export function StatusCard({ 
  status, 
  isLoading, 
  className,
  currentLocation,
  onLocationChange 
}: StatusCardProps) {
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  if (isLoading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded-md w-48 mx-auto" />
          <div className="h-4 bg-muted rounded-md w-32 mx-auto" />
        </div>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <p className="text-muted-foreground">No status information available</p>
      </Card>
    );
  }

  return (
    <Card className={cn("p-6 space-y-6", className)}>
      <div className="flex flex-col items-center gap-4">
        <StatusBadge
          isOpen={status.openNow}
          closesAt={status.closesAt}
          opensAt={status.opensAt}
        />
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold">{status.placeName}</h2>
          <p className="text-muted-foreground text-sm">{status.address}</p>
        </div>
      </div>

      {status.weekdayText && status.weekdayText.length > 0 && (
        <div className="border-t pt-4">
          <Button
            variant="ghost"
            onClick={() => setShowFullSchedule(!showFullSchedule)}
            className="w-full justify-between"
          >
            <span className="font-medium">Weekly Hours</span>
            {showFullSchedule ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </Button>
          {showFullSchedule && (
            <div className="mt-4 space-y-2">
              {status.weekdayText.map((day, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center py-2 border-b last:border-b-0"
                >
                  <span className="text-sm">{day}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {status.businessStatus !== "OPERATIONAL" && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3 text-sm text-amber-900 dark:text-amber-100">
          <strong>Note:</strong> This location may have special hours or be temporarily closed.
        </div>
      )}

      {onLocationChange && (
        <>
          <div className="border-t pt-4">
            <Button
              variant="ghost"
              onClick={() => setLocationModalOpen(true)}
              className="w-full text-sm"
            >
              Change location
            </Button>
          </div>
          <LocationModal
            open={locationModalOpen}
            onOpenChange={setLocationModalOpen}
            onLocationSelect={(newLocation) => {
              if (typeof window !== "undefined") {
                localStorage.setItem("open-status-location", JSON.stringify(newLocation));
              }
              onLocationChange();
            }}
            currentLocation={currentLocation}
          />
        </>
      )}
    </Card>
  );
}

