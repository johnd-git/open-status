# OpenNow - Project Context

> "Is it open?" - A fast, mobile-first app to check if businesses are open near you.

## Overview

OpenNow is a Next.js 16 application that lets users search for any business and instantly see if it's open, along with hours, distance, and directions. It uses the Google Places API for real-time business data and Upstash Redis for caching.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| API | Google Places API (Text Search, Place Details, Geocoding) |
| Caching | Upstash Redis |
| Analytics | Vercel Analytics |
| Hosting | Vercel |
| Icons | Lucide React |
| Search | Fuse.js (client-side fuzzy search for suggestions) |
| Theming | next-themes |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Home Page   │  │ Search      │  │ Status Result       │  │
│  │ (/)         │  │ Results     │  │ (Detail View)       │  │
│  │             │  │ List        │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Routes                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ /api/search │  │ /api/status │  │ /api/geocode        │  │
│  │ (list)      │  │ (details)   │  │ (zip/city lookup)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  Redis   │  │  Google  │  │  ipapi   │
        │  Cache   │  │  Places  │  │  (IP geo)│
        └──────────┘  └──────────┘  └──────────┘
```

## Key Features

### 1. Multi-Result Search
- Search for any business type (not limited to a predefined list)
- Returns up to 8 nearby results sorted by distance
- Shows open/closed status, address, and distance for each result
- Click any result to see full details

### 2. Smart Generic Term Detection
Generic searches like "food", "gas", "coffee" are automatically enhanced:

```
"food" → searches for "restaurant" (type: restaurant)
"gas"  → searches for "gas station" (type: gas_station)
"coffee" → searches for "coffee shop" (type: cafe)
```

80+ generic terms are mapped for better results.

### 3. Location Detection
Priority order:
1. Cached location from localStorage
2. Browser HTML5 Geolocation API
3. IP-based fallback (ipapi.co) with rate limit handling

### 4. Caching Strategy
- **Search results**: 15 minute TTL
- **Place details**: 5 minute TTL
- Cache key format: `search:{query}:{lat}:{lng}` and `status:{placeId}`

### 5. Mobile-First Design
- Search bar moves below toolbar on mobile (like Vercel)
- Location shown in header on all screen sizes
- Responsive result cards with truncation

### 6. Dark Mode
- System preference detection
- Manual toggle (sun/moon icon)
- Persisted via next-themes

## File Structure

```
open-status/
├── app/
│   ├── api/
│   │   ├── geocode/route.ts    # ZIP/city geocoding
│   │   ├── search/route.ts     # Multi-result search endpoint
│   │   └── status/route.ts     # Place details endpoint
│   ├── [chain]/
│   │   └── [city-state]/
│   │       └── page.tsx        # SEO-friendly dynamic route
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Main home page
│   ├── sitemap.ts              # Dynamic sitemap generation
│   └── robots.ts               # Robots.txt
├── components/
│   ├── countdown-timer.tsx     # Live countdown to open/close
│   ├── location-modal.tsx      # Manual location input
│   ├── search-input.tsx        # Autocomplete search with suggestions
│   ├── search-results-list.tsx # Multi-result list view
│   ├── status-badge.tsx        # Open/Closed badge
│   ├── status-card.tsx         # Full status display card
│   ├── status-result.tsx       # Detail view component
│   ├── theme-provider.tsx      # Dark mode provider
│   └── theme-toggle.tsx        # Theme switch button
├── data/
│   ├── chains.json             # Popular chain suggestions
│   └── top-cities.json         # Cities for static generation
├── hooks/
│   ├── use-debounce.ts         # Input debouncing
│   └── use-geolocation.ts      # Location hook with fallbacks
├── lib/
│   ├── analytics.ts            # Vercel Analytics wrapper
│   ├── cache.ts                # Redis cache helpers
│   ├── redis.ts                # Upstash Redis client
│   ├── seo.ts                  # Metadata generation helpers
│   ├── types/
│   │   └── status.ts           # TypeScript interfaces
│   └── utils.ts                # Utility functions (cn)
└── CONTEXT.md                  # This file
```

## API Endpoints

### `GET /api/search`
Returns multiple nearby places matching a query.

**Parameters:**
- `query` (required): Search term
- `lat` (required): Latitude
- `lng` (required): Longitude
- `limit` (optional): Max results (default: 6)

**Response:**
```json
{
  "results": [
    {
      "placeId": "ChIJ...",
      "name": "Starbucks",
      "address": "123 Main St, City, ST 12345",
      "distance": 0.5,
      "distanceMiles": 0.31,
      "isOpen": true
    }
  ],
  "query": "coffee"
}
```

### `GET /api/status`
Returns detailed status for a specific place.

**Parameters:**
- `place_id` (required if no query): Google Place ID
- `query` (required if no place_id): Search term
- `lat` (required with query): Latitude
- `lng` (required with query): Longitude

**Response:**
```json
{
  "isOpen": true,
  "openNow": true,
  "closesAt": "9:00 PM",
  "weekdayText": ["Monday: 6:00 AM – 9:00 PM", ...],
  "timezone": "UTC-5",
  "businessStatus": "OPERATIONAL",
  "placeName": "Starbucks",
  "address": "123 Main St, City, ST 12345",
  "placeId": "ChIJ..."
}
```

### `GET /api/geocode`
Geocodes a ZIP code or city-state query.

**Parameters:**
- `zip` (optional): 5-digit ZIP code
- `query` (optional): City, State string

**Response:**
```json
{
  "lat": 39.7684,
  "lng": -86.1581
}
```

## User Flow

```
1. Landing Page
   └── User sees search bar + popular search buttons
   
2. Search
   └── User types or clicks a suggestion
   └── API returns list of nearby matches
   
3. Results List
   └── Shows 8 results with name, status, distance
   └── Each result is clickable
   
4. Detail View
   └── Full status card with hours, countdown, directions
   └── "Back to results" to return to list
   └── "Search for something else" to start over
```

## Key Implementation Details

### Distance Calculation
Uses Haversine formula to calculate great-circle distance:
```typescript
function getDistance(lat1, lng1, lat2, lng2): number {
  const R = 6371; // Earth's radius in km
  // ... haversine calculation
  return R * c; // Returns kilometers
}
```

### Generic Term Enhancement
The `/api/search` route has a mapping of 80+ casual terms to better Google Places queries:
```typescript
const GENERIC_TERM_MAP = {
  food: { query: "restaurant", type: "restaurant" },
  gas: { query: "gas station", type: "gas_station" },
  // ...
};
```

### URL Structure
SEO-friendly URLs without causing navigation flash:
```
/                           → Home page
/starbucks/indianapolis-in  → Direct link to result
```

URL updates use `window.history.replaceState` to avoid re-fetching.

### Caching
Redis caching prevents excessive Google API calls:
- Search results cached by `query + lat + lng` (15 min)
- Place details cached by `placeId` (5 min)

## Environment Variables

```env
# Required
GOOGLE_PLACES_API_KEY=your_api_key

# Optional but recommended
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Auto-set by Vercel
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## Development

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Build for production
pnpm build
```

## Future Enhancements (Not Implemented)

- [ ] Favorites/saved places
- [ ] Push notifications for closing soon
- [ ] Holiday hours detection
- [ ] User accounts
- [ ] "Open late" filter
- [ ] Share functionality

---

*Last updated: January 2026*

