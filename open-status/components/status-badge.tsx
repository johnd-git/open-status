"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CountdownTimer } from "@/components/countdown-timer";

interface StatusBadgeProps {
  isOpen: boolean;
  closesAt?: string;
  opensAt?: string;
  className?: string;
}

export function StatusBadge({ isOpen, closesAt, opensAt, className }: StatusBadgeProps) {
  const isClosingSoon = isOpen && closesAt;

  return (
    <Badge
      className={cn(
        "min-h-12 px-6 py-3 text-lg font-semibold",
        isOpen
          ? isClosingSoon
            ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
            : "bg-green-500 hover:bg-green-600 text-white"
          : "bg-red-500 hover:bg-red-600 text-white",
        className
      )}
    >
      <div className="flex flex-col items-center gap-1">
        <span>
          {isOpen ? "OPEN" : "CLOSED"}
        </span>
        {isOpen && closesAt && (
          <span className="text-sm font-normal flex items-center gap-1">
            until {closesAt}
            <CountdownTimer targetTime={closesAt} />
          </span>
        )}
        {!isOpen && opensAt && (
          <span className="text-sm font-normal">
            Opens {opensAt}
          </span>
        )}
      </div>
    </Badge>
  );
}

