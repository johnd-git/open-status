"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Fuse from "fuse.js";
import chainsData from "@/data/chains.json";
import { SearchIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchResult {
  name: string;
  slug: string;
  placeType: string;
  isCustom?: boolean;
}

interface SearchInputProps {
  onSearch: (query: SearchResult) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
}

export function SearchInput({
  onSearch,
  placeholder = "Search any store, restaurant, or business...",
  className,
  initialValue = "",
}: SearchInputProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const chains = chainsData as SearchResult[];

  const fuse = useMemo(
    () =>
      new Fuse(chains, {
        keys: ["name"],
        threshold: 0.3,
        includeScore: true,
      }),
    [chains]
  );

  const suggestions = useMemo(() => {
    if (!inputValue.trim()) {
      // Show popular chains when empty
      return chains.slice(0, 6);
    }

    const results = fuse.search(inputValue);
    const matched = results.slice(0, 5).map((result) => result.item);

    // Always add the custom search option if there's input
    const customOption: SearchResult = {
      name: inputValue,
      slug: inputValue.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      placeType: "search",
      isCustom: true,
    };

    return [...matched, customOption];
  }, [inputValue, fuse, chains]);

  function handleSelect(result: SearchResult) {
    onSearch(result);
    setInputValue("");
    setIsOpen(false);
  }

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    // If there's a highlighted suggestion, use it
    if (suggestions[highlightedIndex] && !suggestions[highlightedIndex].isCustom) {
      handleSelect(suggestions[highlightedIndex]);
    } else {
      // Otherwise search for the raw input
      handleSelect({
        name: inputValue,
        slug: inputValue.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        placeType: "search",
        isCustom: true,
      });
    }
  }

  function handleClear() {
    setInputValue("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen && e.key !== "Escape") {
      setIsOpen(true);
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        handleSubmit();
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  }

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
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
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
            "placeholder:text-zinc-400"
          )}
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 flex items-center justify-center transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-2 py-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl shadow-zinc-200/50 dark:shadow-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 max-h-80 overflow-auto"
        >
          {!inputValue && (
            <li className="px-4 py-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Popular searches
            </li>
          )}
          {suggestions.map((result, index) => (
            <li key={result.isCustom ? "custom" : result.slug}>
              <button
                type="button"
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  "w-full px-4 py-3 text-left flex items-center gap-3 transition-colors",
                  highlightedIndex === index
                    ? "bg-emerald-50 dark:bg-emerald-950/50"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                {result.isCustom ? (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                      <SearchIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <span className="font-medium">Search for &quot;{result.name}&quot;</span>
                      <p className="text-xs text-zinc-400">Find any business nearby</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-lg font-bold text-zinc-400">
                      {result.name.charAt(0)}
                    </div>
                    <span className="font-medium">{result.name}</span>
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

