import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained server (`.next/standalone`) for the
  // Docker image - see Dockerfile.
  output: "standalone",
  experimental: {
    // Server Actions default to a 1MB body limit, but attachments (see
    // src/lib/storage.ts MAX_ATTACHMENT_SIZE_BYTES) allow up to 15MB.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
