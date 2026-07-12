import type { NextConfig } from "next";
import path from "path";

const rootNodeModules = path.resolve(__dirname, "../../node_modules");

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname, "../../"),
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      rootNodeModules,
    ];
    config.resolve.alias = {
      ...config.resolve.alias,
      "@livekit/components-react": path.resolve(rootNodeModules, "@livekit/components-react"),
      "livekit-client": path.resolve(rootNodeModules, "livekit-client"),
      "livekit-server-sdk": path.resolve(rootNodeModules, "livekit-server-sdk"),
    };
    return config;
  },
};

export default nextConfig;
