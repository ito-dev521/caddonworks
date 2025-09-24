/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['avatars.githubusercontent.com', 'images.unsplash.com'],
  },
  // Optimize for Vercel deployment - remove standalone to avoid build issues
  experimental: {
    // Improve build performance
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog'],
  },
}

module.exports = nextConfig