"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  targetTime: string; // "9:30 PM" format
  className?: string;
}

export function CountdownTimer({ targetTime, className }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    const updateTimer = () => {
      try {
        const now = new Date();
        const [time, period] = targetTime.split(" ");
        const [hours, minutes] = time.split(":").map(Number);
        
        let targetHours = hours;
        if (period === "PM" && hours !== 12) {
          targetHours = hours + 12;
        } else if (period === "AM" && hours === 12) {
          targetHours = 0;
        }

        const target = new Date(now);
        target.setHours(targetHours, minutes, 0, 0);

        // If target time is earlier today, assume it's tomorrow
        if (target <= now) {
          target.setDate(target.getDate() + 1);
        }

        const diff = target.getTime() - now.getTime();

        if (diff <= 0) {
          setTimeRemaining("Closed");
          return;
        }

        const hoursRemaining = Math.floor(diff / (1000 * 60 * 60));
        const minutesRemaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hoursRemaining > 0) {
          setTimeRemaining(`${hoursRemaining}h ${minutesRemaining}m`);
        } else {
          setTimeRemaining(`${minutesRemaining}m`);
        }
      } catch (e) {
        setTimeRemaining("");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [targetTime]);

  if (!timeRemaining) return null;

  return (
    <span className={cn("tabular-nums", className)}>
      {timeRemaining}
    </span>
  );
}

