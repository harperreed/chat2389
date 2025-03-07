/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use the app directory
  reactStrictMode: true,
  
  // Allow importing CSS modules
  webpack(config) {
    return config;
  },
  
  // Add custom headers for permissions - allow camera and microphone
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Permissions-Policy',
            value: 'camera=self, microphone=self, display-capture=self'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;