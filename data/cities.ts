import { Match } from "@/lib/data";

export const CITY_TIMEZONES: Record<string, string> = {
  "Mexico City": "America/Mexico_City",
  "Guadalajara": "America/Mexico_City",
  "Monterrey": "America/Monterrey",
  "Atlanta": "America/New_York",
  "Boston": "America/New_York",
  "Dallas": "America/Chicago",
  "Houston": "America/Chicago",
  "Kansas City": "America/Chicago",
  "Los Angeles": "America/Los_Angeles",
  "Miami": "America/New_York",
  "New York": "America/New_York",
  "Philadelphia": "America/New_York",
  "San Francisco": "America/Los_Angeles",
  "Seattle": "America/Los_Angeles",
  "Toronto": "America/Toronto",
  "Vancouver": "America/Vancouver",
};

export function getMatchTimeInfo(match: Match) {
  const matchDate = new Date(match.date);
  const cityTz = CITY_TIMEZONES[match.city];

  const stadiumTime = cityTz
    ? matchDate.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: cityTz,     
      })
    : null;

  const localTime = matchDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return { stadiumTime, localTime };
}