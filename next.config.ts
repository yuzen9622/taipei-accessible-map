import type { NextConfig } from "next";

const isCapacitorBuild = process.env.CAP_BUILD === "1";

const nextConfig: NextConfig = {
  output: isCapacitorBuild ? "export" : "standalone",
  /* config options here */ trailingSlash: true,

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "places.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "maps.gstatic.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "tdx.transportdata.tw",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
