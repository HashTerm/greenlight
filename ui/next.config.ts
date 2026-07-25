import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

// Load root .env so hybrid npm dev shares secrets with core / compose
loadEnvConfig(path.join(__dirname, ".."));

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
