
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // 開発中のNext.jsロゴを非表示にする
  devIndicators: false,

  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
