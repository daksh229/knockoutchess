import path from "node:path";
import type { NextConfig } from "next";

// Cache Components is intentionally off: nearly every page here shows
// per-user, live tournament data, so pages render fresh on each request.
const nextConfig: NextConfig = {
  turbopack: {
    // Pin the root to this folder (a stray lockfile higher up confuses auto-detection).
    root: path.resolve(process.cwd()),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
