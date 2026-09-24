import type { NextConfig } from "next";

const STACK = "/:owner/:repo/stacks/:number(\\d+)";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: `${STACK}\\.md`,
        destination: "/:owner/:repo/stacks/:number/markdown",
      },
      {
        source: `${STACK}\\.json`,
        destination: "/:owner/:repo/stacks/:number/json",
      },
      // Content negotiation: agents that ask for Markdown get it at the
      // same URL a person would share.
      {
        source: STACK,
        has: [{ type: "header", key: "accept", value: ".*text/markdown.*" }],
        destination: "/:owner/:repo/stacks/:number/markdown",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
