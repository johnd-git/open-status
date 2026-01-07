# Open Status MVP Launch Plan

> **Goal:** Ship a deployable, indexable "Is [Chain] open near me?" app in one weekend sprint.  
> **Stop condition:** Site is live, crawlable, and can start ranking on Google.

---

## Phase 1: Foundation (Commits 1–3)

### 1. Project Skeleton

**Time:** 1 hour

- [ ] Initialize Next.js 14+ with App Router + TypeScript
- [ ] Configure Tailwind CSS with custom theme tokens
- [ ] Add Prettier + ESLint + lint-staged pre-commit hooks
- [ ] Create basic layout shell with responsive container
- [ ] Deploy empty shell to Vercel (proves CI/CD works)

```bash
npx create-next-app@latest open-status --typescript --tailwind --app
```

---

### 2. Environment & API Setup

**Time:** 30 min

- [ ] Create `.env.local` and `.env.example`
- [ ] Enable Google Places API + Place Details in GCP Console
- [ ] Add `GOOGLE_PLACES_API_KEY` to Vercel env vars
- [ ] (Optional) Mapbox token for static map fallback

```env
GOOGLE_PLACES_API_KEY=your_key_here
NEXT_PUBLIC_MAPBOX_TOKEN=optional_for_maps
```

---

### 3. Location Hook

**Time:** 2 hours

- [ ] Create `useGeolocation()` hook with permission states
- [ ] HTML5 Geolocation API with timeout (5s)
- [ ] Fallback to IP-based city via `ipapi.co` (free tier)
- [ ] Persist chosen location in `localStorage`
- [ ] Read cached location on mount (avoid re-prompt)

**States to handle:**

- `idle` → `loading` → `success` | `denied` | `error`

---

## Phase 2: Core Feature (Commits 4–6)

### 4. Chain Autocomplete

**Time:** 2 hours

- [ ] Create `chains.json` with top 100 chains (start smaller, expand later)
  - Include: `name`, `slug`, `placeType`, `logo?`
- [ ] Implement Fuse.js fuzzy search (client-side)
- [ ] Debounce input 150ms
- [ ] Show 5–8 results max in dropdown
- [ ] Keyboard navigation (arrow keys + enter)

**Chain categories to cover:**

- Retail: Target, Walmart, Costco, CVS, Walgreens
- Food: Starbucks, McDonald's, Chipotle, Chick-fil-A
- Grocery: Trader Joe's, Whole Foods, Kroger, Publix
- Home: Home Depot, Lowe's, IKEA, Bed Bath & Beyond

---

### 5. Status API Endpoint

**Time:** 2 hours

- [ ] Create `/api/status/route.ts`
- [ ] Accept `place_id` OR `chain_slug` + `lat,lng`
- [ ] If no `place_id`, call Places Nearby Search first
- [ ] Call Place Details with minimal fields:
  ```
  fields=opening_hours,utc_offset_minutes,business_status
  ```
- [ ] Transform response to clean shape:

```typescript
interface StatusResponse {
  isOpen: boolean;
  openNow: boolean;
  closesAt?: string; // "9:30 PM"
  opensAt?: string; // "7:00 AM tomorrow"
  weekdayText: string[]; // Full week schedule
  timezone: string;
  businessStatus: "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY";
  placeName: string;
  address: string;
  placeId: string;
}
```

---

### 6. Status Card UI

**Time:** 3 hours

- [ ] Giant pill badge component:
  - 🟢 **OPEN** — green bg, white text
  - 🔴 **CLOSED** — red bg, white text
  - 🟡 **CLOSING SOON** — amber (< 30 min)
- [ ] Show "until 9:30 PM" with live countdown
- [ ] If closed, show "Opens at 7:00 AM"
- [ ] Client-side tick every 60s to update countdown
- [ ] Full week schedule accordion below
- [ ] Skeleton loading state

**Design notes:**

- Badge should be unmissable — minimum 48px tall
- Use `tabular-nums` for countdown to prevent layout shift
- Add subtle pulse animation when "CLOSING SOON"

---

## Phase 3: Caching & SEO (Commits 7–9)

### 7. Redis Caching Layer ⚡ CRITICAL

**Time:** 1.5 hours

> **Move this UP** — you'll burn through Google's free quota in hours without it.

- [ ] Set up Upstash Redis (free tier: 10k requests/day)
- [ ] Cache Place Details response: **5 min TTL**
- [ ] Cache key format: `status:${placeId}`
- [ ] Cache Nearby Search results: **15 min TTL**
- [ ] Add cache hit/miss to response headers for debugging

```typescript
const cached = await redis.get(`status:${placeId}`);
if (cached) return JSON.parse(cached);
// ... fetch from Google
await redis.setex(`status:${placeId}`, 300, JSON.stringify(data));
```

---

### 8. SEO URL Structure

**Time:** 3 hours

- [ ] Route: `/[chain]/[city-state]` (e.g., `/target/dallas-tx`)
- [ ] Generate static params for top 500 city-chain combos
- [ ] ISR fallback for long-tail: `revalidate: 3600`
- [ ] Add canonical URL meta tag
- [ ] Add structured data (`LocalBusiness` + `OpeningHoursSpecification`)

```typescript
// generateStaticParams for pre-rendering
export async function generateStaticParams() {
  const topChains = ['target', 'walmart', 'starbucks', ...];
  const topCities = ['new-york-ny', 'los-angeles-ca', ...];
  return topChains.flatMap(chain =>
    topCities.map(city => ({ chain, city }))
  );
}
```

**SEO checklist:**

- [ ] `<title>`: "Is Target Open in Dallas, TX? Hours & Status"
- [ ] `<meta description>`: "Check if Target is open right now..."
- [ ] `<link rel="canonical">`
- [ ] JSON-LD structured data

---

### 9. Sitemap & Robots

**Time:** 1 hour

- [ ] Generate `/sitemap.xml` dynamically
- [ ] Include all static city-chain pages
- [ ] Add `robots.txt` allowing all crawlers
- [ ] Set up Google Search Console
- [ ] Submit sitemap

---

## Phase 4: Polish for Launch (Commits 10–11)

### 10. Change Location Flow

**Time:** 2 hours

- [ ] "Check another location" link below status card
- [ ] Inline modal with two options:
  1. **ZIP code input** → geocode via Google
  2. **Use my location** → re-trigger geolocation
- [ ] Update URL without full page reload
- [ ] Persist new location choice to localStorage

---

### 11. Analytics & Performance

**Time:** 1 hour

- [ ] Add Plausible Analytics (privacy-friendly, no cookie banner)
- [ ] Track events: `search`, `change_location`, `view_hours`
- [ ] Set up Lighthouse CI in GitHub Actions
- [ ] Performance budget:
  - LCP < 2.5s on 4G
  - CLS < 0.1
  - FID < 100ms

---

## 🚀 LAUNCH CHECKPOINT

**Stop here. You now have:**

- ✅ Working app with core functionality
- ✅ SEO-optimized pages that Google can index
- ✅ Caching to stay within API quotas
- ✅ Analytics to track usage
- ✅ Fast, mobile-friendly UI

**Deploy command:**

```bash
git push origin main  # Vercel auto-deploys
```

**Post-deploy checklist:**

- [ ] Verify production env vars are set
- [ ] Test a few chains manually
- [ ] Submit to Google Search Console
- [ ] Check Lighthouse scores

---

## Phase 5: Post-Launch Enhancements

> Only build these once you have traffic and user feedback.

### 12. Holiday Banner

- Hard-coded JSON of special hours for major holidays
- Show banner 7 days before holiday
- Data source: Manually curate from chain websites

### 13. Share & Copy

- `navigator.share()` on mobile
- "Copy link" button on desktop
- Short URL with `?place_id=...`

### 14. Basic Monetization

- AdSense anchor unit below status card
- Affiliate: DoorDash/Uber Eats link if chain has delivery
- Only add once traffic justifies the UX cost

### 15. Content SEO

- Blog posts: "Is Target open on July 4th?"
- FAQ schema for common questions
- 301 redirects for typo domains

### 16. Advanced Features (v2)

- Save favorite chains
- Push notifications for "opening soon"
- Multi-location comparison
- Hours history / reliability score

---

## Tech Stack Summary

| Layer     | Choice                  | Why                           |
| --------- | ----------------------- | ----------------------------- |
| Framework | Next.js 14 (App Router) | SSR + ISR + API routes        |
| Styling   | Tailwind CSS            | Rapid UI development          |
| Hosting   | Vercel                  | Zero-config deploys           |
| API       | Google Places           | Authoritative hours data      |
| Cache     | Upstash Redis           | Free tier, edge-compatible    |
| Search    | Fuse.js                 | Client-side, no server needed |
| Analytics | Plausible               | Privacy-friendly, simple      |

---

## Estimated Timeline

| Phase            | Time        | Outcome               |
| ---------------- | ----------- | --------------------- |
| 1. Foundation    | 3.5 hrs     | Empty shell deployed  |
| 2. Core Feature  | 7 hrs       | Working status lookup |
| 3. Caching & SEO | 5.5 hrs     | Indexable pages       |
| 4. Polish        | 3 hrs       | **🚀 Launch-ready**   |
| **Total MVP**    | **~19 hrs** | **One weekend**       |

---

## Risk Mitigation

| Risk                        | Mitigation                                         |
| --------------------------- | -------------------------------------------------- |
| Google API quota exceeded   | Redis cache + monitor usage                        |
| Places API returns no hours | Graceful fallback: "Hours unavailable, call store" |
| User denies location        | IP fallback + manual ZIP entry                     |
| Slow LCP on mobile          | Static generation + edge caching                   |
| Chain not in our list       | Show Google search link as escape hatch            |

---

## Success Metrics (Week 1)

- [ ] 100+ pages indexed in Google
- [ ] < 2.5s LCP on mobile
- [ ] < $5 Google API spend
- [ ] 10+ organic search impressions

---

_Last updated: January 7, 2026_
