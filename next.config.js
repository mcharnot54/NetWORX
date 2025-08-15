/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for better Electron integration
  output: 'standalone',
  
  // Optimize for Electron environment
  trailingSlash: true,
  
  // Asset optimization
  images: {
    unoptimized: true
  },
  
  // Disable SWC minification issues in Electron
  swcMinify: false,
  
  // Environment configuration
  env: {
    ELECTRON: process.env.ELECTRON || 'false'
  },
  
  // Webpack configuration for Electron compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.target = 'electron-renderer';
    }
    
    // Handle Electron-specific modules
    config.externals = config.externals || [];
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    
    return config;
  },
  
  // Experimental features
  experimental: {
    // Improve performance
    optimizeCss: true
  }
};

module.exports = nextConfig;
