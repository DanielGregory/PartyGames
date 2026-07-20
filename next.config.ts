import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js's automatic file tracing doesn't reliably pick up a data file
  // that's only referenced via a runtime-built path (server/wordbank/dictionary.ts
  // reads it via `path.join(process.cwd(), ...)`), so it's declared explicitly
  // here rather than risking a "file not found" only in production.
  outputFileTracingIncludes: {
    "/api/*": ["./server/wordbank/words.txt"],
  },
};

export default nextConfig;
