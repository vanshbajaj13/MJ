/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jewelrycdn.b-cdn.net',
        port: '',
        pathname: '/**',
      },
      // Add other domains you use for images
    ],
  },
};

export default nextConfig;
