import type { NextConfig } from "next";
const nextConfig: NextConfig = { outputFileTracingRoot: process.cwd(), images: { remotePatterns: [{ protocol: "https", hostname: "api.daburinternational.com" }] }, poweredByHeader: false };
export default nextConfig;
