/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable standalone for now to simplify build
  // ...(process.env.ELECTRON === 'true' && { output: 'standalone' }),

  // Disable static generation to avoid Html import errors during build
  experimental: {
    missingSuspenseWithCSRBailout: false,
    // Optimize development server performance
    optimizePackageImports: ['lucide-react'],
    // Fix dev server stability
    turbo: {
      loaders: {
        '.xlsx': ['raw-loader'],
        '.xls': ['raw-loader'],
      },
    },
  },

  // Improve development server stability - Increase buffers to prevent crashes
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 1000, // Increased from 25s to 60s
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5, // Increased from 2 to 5
  },

  // Fix cross-origin and networking issues
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
    ];
  },

  // Asset optimization
  images: {
    unoptimized: process.env.ELECTRON === 'true'
  },

  // Environment configuration
  env: {
    ELECTRON: process.env.ELECTRON || 'false'
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Only apply Electron-specific config when building for Electron
    if (process.env.ELECTRON === 'true' && !isServer) {
      config.target = 'electron-renderer';
    }

    // Provide polyfills for Node.js globals in browser environment
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };

      // Define global for browser environment
      const webpack = require('webpack');
      config.plugins.push(
        new webpack.DefinePlugin({
          global: 'globalThis',
        })
      );
    }

    // Handle Electron-specific modules only when needed
    if (process.env.ELECTRON === 'true') {
      config.externals = config.externals || [];
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      });
    }

    // Development optimizations to prevent fetch failures
    if (!isServer && process.env.NODE_ENV === 'development') {
      // Reduce compilation time and prevent memory issues
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxSize: 200000, // Limit chunk size to prevent large payloads
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              maxSize: 300000,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              maxSize: 200000,
            },
          },
        },
        // Prevent memory leaks in development
        sideEffects: false,
      };

      // Add development server optimizations
      config.devServer = {
        ...config.devServer,
        compress: true,
        historyApiFallback: true,
        hot: true,
        liveReload: true,
      };
    }

    return config;
  }
};

module.exports = nextConfig;
