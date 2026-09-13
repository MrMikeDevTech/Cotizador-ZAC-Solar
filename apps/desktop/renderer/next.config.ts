import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  transpilePackages: ["@cotizador/shared"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  trailingSlash: true,
};

export default nextConfig;