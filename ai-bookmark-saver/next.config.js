/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // YouTube thumbnails
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      // AWS S3
      { protocol: 'https', hostname: '*.s3.*.amazonaws.com' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      // Cloudflare R2
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.r2.dev' },
      // Google user avatars (NextAuth)
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Generic CDN catch-all (useful in development)
      { protocol: 'https', hostname: '**' },
    ],
  },
  // Required for server-only imports (Prisma, ioredis) not being bundled for the client
  serverExternalPackages: ['@prisma/client', 'prisma', 'ioredis'],
};

module.exports = nextConfig;
