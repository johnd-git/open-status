import { Metadata } from "next";

export function generateChainMetadata(
  chainName: string,
  city: string,
  state: string
): Metadata {
  const title = `Is ${chainName} Open in ${city}, ${state}? Hours & Status`;
  const description = `Check if ${chainName} is open right now in ${city}, ${state}. View current hours, status, and weekly schedule.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export function generateStructuredData(
  chainName: string,
  city: string,
  state: string,
  status: {
    placeName: string;
    address: string;
    weekdayText: string[];
    openNow: boolean;
  }
) {
  // Parse weekday text to extract hours
  const openingHours: string[] = [];
  status.weekdayText.forEach((day) => {
    const match = day.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/);
    if (match) {
      openingHours.push(`${match[1]}-${match[2]}`);
    }
  });

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: status.placeName,
    address: {
      "@type": "PostalAddress",
      streetAddress: status.address,
      addressLocality: city,
      addressRegion: state,
      addressCountry: "US",
    },
    openingHoursSpecification: openingHours.map((hours, index) => {
      const [open, close] = hours.split("-");
      const dayNames = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      return {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: dayNames[index % 7],
        opens: open.trim(),
        closes: close.trim(),
      };
    }),
  };
}

