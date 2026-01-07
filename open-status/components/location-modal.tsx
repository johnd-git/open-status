"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPinIcon, NavigationIcon, AlertTriangleIcon } from "lucide-react";

interface LocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLocationSelect: (location: { lat: number; lng: number; city?: string; state?: string }) => void;
  currentLocation?: { lat: number; lng: number; city?: string; state?: string; accuracy?: number } | null;
}

export function LocationModal({
  open,
  onOpenChange,
  onLocationSelect,
  currentLocation,
}: LocationModalProps) {
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isImprecise = currentLocation?.accuracy && currentLocation.accuracy > 1000;

  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/geocode?query=${encodeURIComponent(address)}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to find location");
      }

      const data = await response.json();
      onLocationSelect({
        lat: data.lat,
        lng: data.lng,
        city: data.city,
        state: data.state,
      });
      onOpenChange(false);
      setAddress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGetPreciseLocation() {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Got coordinates, now reverse geocode
          const response = await fetch(
            `/api/geocode?lat=${position.coords.latitude}&lng=${position.coords.longitude}`
          );
          
          if (response.ok) {
            const data = await response.json();
            onLocationSelect({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              city: data.city,
              state: data.state,
            });
          } else {
            onLocationSelect({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            });
          }
          onOpenChange(false);
        } catch {
          onLocationSelect({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          onOpenChange(false);
        } finally {
          setIsGettingLocation(false);
        }
      },
      (err) => {
        setIsGettingLocation(false);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location access denied. Please enter an address instead.");
        } else {
          setError("Could not get your location. Please enter an address.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPinIcon className="w-5 h-5" />
            Set Your Location
          </DialogTitle>
          <DialogDescription>
            Enter your address or ZIP code for precise search results.
          </DialogDescription>
        </DialogHeader>

        {isImprecise && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-sm">
            <AlertTriangleIcon className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-amber-800 dark:text-amber-200">
              <p className="font-medium">Location is approximate</p>
              <p className="text-xs mt-0.5">
                Your current location has ~{Math.round((currentLocation?.accuracy || 0) / 1000)}km accuracy. 
                Enter your address for better results.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <form onSubmit={handleAddressSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address or ZIP Code</Label>
              <Input
                id="address"
                type="text"
                placeholder="123 Main St, City, State or 46032"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isLoading || isGettingLocation}
                autoComplete="street-address"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button 
              type="submit" 
              disabled={isLoading || isGettingLocation || !address.trim()}
              className="w-full"
            >
              {isLoading ? "Finding location..." : "Set Location"}
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
            onClick={handleGetPreciseLocation}
            disabled={isLoading || isGettingLocation}
            className="w-full"
          >
            <NavigationIcon className="w-4 h-4 mr-2" />
            {isGettingLocation ? "Getting location..." : "Use Device GPS"}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            GPS works best on mobile devices. Desktop browsers may have limited accuracy.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
