"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSelect: (location: { lat: number; lng: number; city?: string; state?: string }) => void;
  currentLocation?: { lat: number; lng: number; city?: string; state?: string } | null;
}

export function LocationModal({
  open,
  onOpenChange,
  onLocationSelect,
  currentLocation,
}: LocationModalProps) {
  const [zip, setZip] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleZipSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!zip.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/geocode?zip=${encodeURIComponent(zip)}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to geocode ZIP code");
      }

      const data = await response.json();
      onLocationSelect(data);
      onOpenChange(false);
      setZip("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  function handleUseCurrentLocation() {
    if (currentLocation) {
      onLocationSelect(currentLocation);
      onOpenChange(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change Location</AlertDialogTitle>
          <AlertDialogDescription>
            Enter a ZIP code or use your current location to check store status.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
          <form onSubmit={handleZipSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                type="text"
                placeholder="12345"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                disabled={isLoading}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" disabled={isLoading || !zip.trim()}>
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={handleUseCurrentLocation}
            disabled={!currentLocation}
            className="w-full"
          >
            Use My Current Location
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

