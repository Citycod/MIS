import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/ro/portfolio",
        destination: "/ro/investments",
        permanent: false,
      },
    ];
  },
  experimental: {
    // TypeScript 5 exposes the compiler API. Using it avoids an empty captured
    // `tsc --showConfig` stream in this Node environment during production builds.
    useTypeScriptCli: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
