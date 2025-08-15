/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only enable standalone output when building for Electron
  ...(process.env.ELECTRON === 'true' && { output: 'standalone' }),

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
      config.plugins.push(
        new config.constructor.DefinePlugin({
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

    return config;
  }
};

module.exports = nextConfig;
