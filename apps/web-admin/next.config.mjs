/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@elo-digital/ui', '@elo-digital/core'],
  experimental: {
    optimizePackageImports: ['@elo-digital/ui']
  },
  images: {
    domains: ['localhost', 'api.elo-digital.com'],
    formats: ['image/avif', 'image/webp']
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/:path*`
      }
    ];
  }
};

export default nextConfig;