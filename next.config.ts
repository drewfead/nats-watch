// @ts-check
import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  instrumentationHook: true,
  /* config options here */
};

export default nextConfig;
