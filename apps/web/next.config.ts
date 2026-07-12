import type { NextConfig } from "next";
import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(__dirname, "../../.env") });

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  env: {
    NEXT_PUBLIC_LIVEKIT_URL: process.env.NEXT_PUBLIC_LIVEKIT_URL || "",
    NEXT_PUBLIC_CLIENT_ID: process.env.CLIENT_ID || "",
  },
};

export default nextConfig;
