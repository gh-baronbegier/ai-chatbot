import { tool } from "ai";
import { z } from "zod";
import { Redis } from "@upstash/redis";

export const getBaronLocation = tool({
  description:
    "Get Baron's current live location. Use this when the user asks where Baron is, Baron's location, or anything about Baron's whereabouts.",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_URL!,
        token: process.env.UPSTASH_REDIS_TOKEN!,
      });

      const scanResult = await redis.scan(0, {
        match: "telemetry.update:*",
        count: 1,
      });

      if (!scanResult || !scanResult[1] || scanResult[1].length === 0) {
        return { error: "Baron's location is not available at the moment." };
      }

      const key = scanResult[1][0] as string;
      const result = await redis.get(key);

      const location = (
        typeof result === "string" ? JSON.parse(result) : result
      ) as Record<string, unknown>;

      const latitude = (location.lat || location.aLat) as number;
      const longitude = (location.lng || location.aLng) as number;
      const timestamp = location.timestamp as string;

      // Calculate time ago
      const millisecondsAgo = Date.now() - new Date(timestamp).getTime();
      const secondsAgo = Math.floor(millisecondsAgo / 1000);
      const minutesAgo = Math.floor(secondsAgo / 60);
      const hoursAgo = Math.floor(minutesAgo / 60);

      let timeAgo: string;
      if (hoursAgo > 0) {
        timeAgo = `${hoursAgo} hour${hoursAgo > 1 ? "s" : ""} ago`;
      } else if (minutesAgo > 0) {
        timeAgo = `${minutesAgo} minute${minutesAgo > 1 ? "s" : ""} ago`;
      } else {
        timeAgo = `${secondsAgo} second${secondsAgo !== 1 ? "s" : ""} ago`;
      }

      // Reverse-geocode via Mapbox
      const mapboxToken = process.env.MAPBOX_TOKEN;
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${mapboxToken}`;

      let address = "Address not available";
      try {
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = (await geocodeResponse.json()) as Record<
          string,
          unknown
        >;

        const features = geocodeData?.features as
          | Array<{ place_name: string }>
          | undefined;
        if (features && features.length > 0) {
          address = features[0].place_name;
        }
      } catch {
        // Continue with coordinates even if geocoding fails
      }

      return {
        name: "Baron",
        latitude,
        longitude,
        address,
        timestamp,
        timeAgo,
        googleMapsUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
        appleMapsUrl: `https://maps.apple.com/?q=${latitude},${longitude}`,
      };
    } catch (error) {
      return {
        error: `Error getting Baron's location: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
