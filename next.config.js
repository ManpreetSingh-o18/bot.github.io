/** @type {import('next').NextConfig} */
const nextConfig = {
  assetPrefix: '/bot.github.io',
  reactStrictMode: true,
  swcMinify: true,
  webpack(config) {
    config.experiments = { ...config.experiments, topLevelAwait: true };
    return config;
  },
};


export default nextConfig;
