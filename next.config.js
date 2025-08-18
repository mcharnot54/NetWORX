/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable standalone for now to simplify build
  // ...(process.env.ELECTRON === 'true' && { output: 'standalone' }),

  // Disable problematic features that cause fetch failures
  experimental: {
    missingSuspenseWithCSRBailout: false,
    // Disable turbo mode that's causing RSC payload issues
    // turbo: false, // Commented out to disable turbo completely
    optimizePackageImports: ['lucide-react'],
  },

  // Disable fast refresh to prevent WebSocket issues
  reactStrictMode: false,

  // Improve development server stability - Aggressive caching for slow environments
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 300 * 1000, // 5 minutes - much longer caching
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 10, // Increased to prevent recompilation
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

    // Simplified development config to prevent fetch failures
    if (!isServer && process.env.NODE_ENV === 'development') {
      // Minimal optimization to prevent issues
      config.optimization = {
        ...config.optimization,
        // Disable complex optimizations that cause issues
        minimize: false,
        splitChunks: false, // Disable chunk splitting that causes RSC issues
      };

      // Disable hot reloading features that cause fetch failures
      config.devServer = {
        ...config.devServer,
        hot: false, // Disable hot reload
        liveReload: false, // Disable live reload
      };
    }

    return config;
  }
};

module.exports = nextConfig;
