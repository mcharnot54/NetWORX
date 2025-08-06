/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  experimental: {
    serverComponentsExternalPackages: [],
    optimisticClientCache: true,
  },

  // Disable source maps in development to reduce memory usage
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
