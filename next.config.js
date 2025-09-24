/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['avatars.githubusercontent.com', 'images.unsplash.com'],
  },
  // Skip build-time validation for production deployment
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  // Optimize for Vercel deployment
  experimental: {
    // Improve build performance
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog'],
  },
}

module.exports = nextConfig