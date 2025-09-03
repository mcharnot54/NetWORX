/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for production Docker image
  output: 'standalone',

  // Disable problematic features that cause fetch failures
  experimental: {
    missingSuspenseWithCSRBailout: false,
    // Removed turbo config - let Next.js handle automatically to avoid config errors
    optimizePackageImports: ['lucide-react'],
    // Disable expensive features for cloud environments
    optimizeCss: false,
    serverComponentsExternalPackages: [],
  },

  // Disable features causing performance issues
  reactStrictMode: false,

  // Improve development server stability - Aggressive caching for slow environments
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 900 * 1000, // 15 minutes - extended caching
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 30, // Increased to prevent recompilation
  },

  // Add request timeout handling
  serverRuntimeConfig: {
    requestTimeout: 120000, // 120 second timeout for development
  },

  // Optimize for slower environments
  compress: false, // Disable compression to reduce CPU load

  // Development server optimizations
  ...(process.env.NODE_ENV === 'development' && {
    devIndicators: {
      buildActivity: false, // Disable build activity indicator
    },
    poweredByHeader: false,
    generateEtags: false,
  }),

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

    // Aggressive optimizations for slow development environment
    if (process.env.NODE_ENV === 'development') {
      // Disable expensive optimizations
      config.optimization = {
        ...config.optimization,
        minimize: false,
        splitChunks: false,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        mergeDuplicateChunks: false,
        providedExports: false,
        usedExports: false,
        sideEffects: false,
      };

      // Faster module resolution
      config.resolve.unsafeCache = true;
      config.resolve.symlinks = false;
      config.resolve.cacheWithContext = false;

      // Reduce module resolution overhead
      config.resolve.modules = ['node_modules'];
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': '.'
      };

      // Disable expensive features
      config.stats = false; // Completely disable stats
      config.infrastructureLogging = { level: 'error' };

      // Disable module concatenation for faster builds
      config.optimization.concatenateModules = false;

      // Aggressive caching with optimization
      config.cache = {
        type: 'filesystem',
        allowCollectingMemory: false,
        buildDependencies: {
          config: [__filename]
        },
        compression: false, // Disable compression for faster builds
        maxMemoryGenerations: 1
      };

      // Let Next.js handle devtool automatically for optimal performance
      // config.devtool = removed due to performance warnings

      // Client-side optimizations
      if (!isServer) {
        // Disable hot reloading features that cause fetch failures
        config.devServer = {
          ...config.devServer,
          hot: false,
          liveReload: false,
        };
      }
    }

    return config;
  }
};

module.exports = nextConfig;
