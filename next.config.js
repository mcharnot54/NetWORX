/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Improve hot reloading in cloud environments
  webpack: (config, { dev, isServer, webpack }) => {
    if (dev && !isServer) {
      // Check if we're in a cloud environment (Fly.io in this case)
      const isCloudEnvironment = process.env.FLY_APP_NAME || process.env.VERCEL || process.env.NETLIFY;

      if (isCloudEnvironment) {
        // More conservative settings for cloud environments
        config.watchOptions = {
          poll: 3000, // Slower polling for cloud
          aggregateTimeout: 1000,
          ignored: /node_modules/,
        };

        // Use lighter source maps for cloud environments
        config.devtool = 'cheap-module-source-map'; // Lighter source maps for cloud
      } else {
        // Local development settings
        config.watchOptions = {
          poll: 1000,
          aggregateTimeout: 300,
          ignored: /node_modules/,
        };
      }

      // Add HMR error handling
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.DefinePlugin({
          __DEV_HMR_TIMEOUT__: JSON.stringify(isCloudEnvironment ? 15000 : 5000),
          __IS_CLOUD_ENV__: JSON.stringify(!!isCloudEnvironment),
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
            maxSize: isCloudEnvironment ? 200000 : 244000, // Smaller chunks for cloud
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
