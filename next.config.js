/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Improve hot reloading in cloud environments
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },

  // Improve error handling during development
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },

  // Better error boundaries
  experimental: {
    serverComponentsExternalPackages: [],
  },

  // Disable source maps in development to reduce memory usage
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
