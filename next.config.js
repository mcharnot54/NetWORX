/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Improve hot reloading in cloud environments
  webpack: (config, { dev, isServer, webpack }) => {
    if (dev && !isServer) {
      // Improve HMR reliability in cloud environments
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 500,
        ignored: /node_modules/,
      };

      // Add HMR error handling
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.DefinePlugin({
          __DEV_HMR_TIMEOUT__: JSON.stringify(10000),
        })
      );

      // Reduce HMR chunk size for better network handling
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            chunks: 'all',
            maxSize: 244000, // Smaller chunks for better loading
          },
        },
      };
    }
    return config;
  },

  // Improve error handling during development
  onDemandEntries: {
    maxInactiveAge: 60 * 1000, // Increased timeout
    pagesBufferLength: 5,
  },

  // Better error boundaries and cloud support
  experimental: {
    serverComponentsExternalPackages: [],
    // Improve Fast Refresh reliability
    optimisticClientCache: false,
  },

  // Disable source maps in development to reduce memory usage
  productionBrowserSourceMaps: false,

  // Add better error handling for development
  async headers() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/_next/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-cache, no-store, must-revalidate',
            },
          ],
        },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
