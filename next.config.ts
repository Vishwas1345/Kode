import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "picsum.photos" },
      { hostname: "placehold.co" },
    ],
  },
};

export default nextConfig;
