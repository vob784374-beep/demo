import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone',
  turbopack: {
    resolveExtensions: ['.js', '.ts', '.tsx', '.jsx', '.mdx'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:5000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
