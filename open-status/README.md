# Open Status

"Is [Chain] open near me?" - Find real-time store hours and status for major chains.

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# Google Places API
# Get your API key from: https://console.cloud.google.com/apis/credentials
# Enable these APIs:
# - Places API
# - Places API (New)
# - Geocoding API
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Upstash Redis (for caching API responses)
# Get credentials from: https://console.upstash.com/
# Free tier: 10k requests/day
UPSTASH_REDIS_REST_URL=your_upstash_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token_here

```

### 3. Google Cloud Platform Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Places API
   - Places API (New)
   - Geocoding API
4. Create credentials (API Key) in the Credentials section
5. Copy the API key to your `.env.local` file

### 4. Upstash Redis Setup (Optional but Recommended)

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database (free tier available)
3. Copy the REST URL and Token to your `.env.local` file

## Getting Started

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

### Deploy on Vercel

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com/new)
3. Add all environment variables (see "Environment Variables" section above) in Vercel dashboard
4. Deploy!

### Post-Deployment Checklist

- [ ] Verify all environment variables are set in Vercel
- [ ] Test a few chains manually (Target, Starbucks, etc.)
- [ ] Submit sitemap to Google Search Console: `https://yourdomain.com/sitemap.xml`
- [ ] Check Lighthouse scores (target: LCP < 2.5s, CLS < 0.1)
- [ ] Verify Redis caching is working (check response headers for `X-Cache: HIT`)
- [ ] Test location detection and ZIP code geocoding
- [ ] Verify analytics events are firing

### Environment Variables in Vercel

Make sure to set these in your Vercel project settings:

- `GOOGLE_PLACES_API_KEY`
- `UPSTASH_REDIS_REST_URL` (optional but recommended)
- `UPSTASH_REDIS_REST_TOKEN` (optional but recommended)
- `NEXT_PUBLIC_BASE_URL` (your domain, e.g., `https://yourdomain.com`)

**Note:** Vercel Analytics is automatically enabled when deployed to Vercel. No configuration needed!

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!
