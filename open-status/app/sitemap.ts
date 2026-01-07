import { MetadataRoute } from "next";
import chainsData from "@/data/chains.json";
import topCitiesData from "@/data/top-cities.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://yourdomain.com";
  const chains = chainsData as Array<{ slug: string }>;
  const cities = topCitiesData as string[];

  // Generate URLs for top combinations
  const topChains = chains.slice(0, 10);
  const topCities = cities.slice(0, 50);

  const urls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  // Add chain-city combination pages
  topChains.forEach((chain) => {
    topCities.forEach((city) => {
      urls.push({
        url: `${baseUrl}/${chain.slug}/${city}`,
        lastModified: new Date(),
        changeFrequency: "daily",
        priority: 0.8,
      });
    });
  });

  return urls;
}

