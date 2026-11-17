import type { NextConfig } from "next";

// GitHub Pages serves this repo at /portfolioShourya, so the deploy workflow sets PAGES_BASE_PATH to that.
// Locally it's empty and the site runs at the root.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export", // plain static files in out/, which GitHub Pages can serve
  basePath,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
