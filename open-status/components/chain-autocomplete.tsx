"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Fuse from "fuse.js";
import chainsData from "@/data/chains.json";
import { SearchIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Chain {
  name: string;
  slug: string;
  placeType: string;
}

interface ChainAutocompleteProps {
  onSelect: (chain: Chain | null) => void;
  selectedChain?: Chain | null;
  placeholder?: string;
  className?: string;
}

export function ChainAutocomplete({
  onSelect,
  selectedChain,
  placeholder = "Search stores & restaurants...",
  className,
}: ChainAutocompleteProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const chains = chainsData as Chain[];

  const fuse = useMemo(
    () =>
      new Fuse(chains, {
        keys: ["name"],
        threshold: 0.3,
        includeScore: true,
      }),
    [chains]
  );

  const filteredChains = useMemo(() => {
    if (!inputValue.trim()) {
      return chains.slice(0, 8);
    }

    const results = fuse.search(inputValue);
    return results.slice(0, 8).map((result) => result.item);
  }, [inputValue, fuse, chains]);

  const handleSelect = useCallback(
    (chain: Chain) => {
      onSelect(chain);
      setInputValue("");
      setIsOpen(false);
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    setInputValue("");
    onSelect(null);
    inputRef.current?.focus();
  }, [onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredChains.length - 1 ? prev + 1 : 0
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredChains.length - 1
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredChains[highlightedIndex]) {
            handleSelect(filteredChains[highlightedIndex]);
          }
          break;
        case "Escape":
          setIsOpen(false);
          break;
      }
    },
    [isOpen, filteredChains, highlightedIndex, handleSelect]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [inputValue]);

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
        <input
          ref={inputRef}
          type="text"
          value={selectedChain ? selectedChain.name : inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            if (selectedChain) {
              onSelect(null);
            }
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "w-full h-12 pl-12 pr-12 rounded-2xl",
            "bg-zinc-100 dark:bg-zinc-800",
            "border-2 border-transparent",
            "focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900",
            "outline-none transition-all duration-200",
            "placeholder:text-zinc-400",
            selectedChain && "pr-12"
          )}
        />
        {(selectedChain || inputValue) && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 flex items-center justify-center transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && filteredChains.length > 0 && !selectedChain && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-2 py-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl shadow-zinc-200/50 dark:shadow-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 max-h-80 overflow-auto"
        >
          {filteredChains.map((chain, index) => (
            <li key={chain.slug}>
              <button
                onClick={() => handleSelect(chain)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  "w-full px-4 py-3 text-left flex items-center gap-3 transition-colors",
                  highlightedIndex === index
                    ? "bg-emerald-50 dark:bg-emerald-950/50"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-lg font-bold text-zinc-400">
                  {chain.name.charAt(0)}
                </div>
                <span className="font-medium">{chain.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
