/** @type {import('next').NextConfig} */
const devOrigin = process.env.NEXT_PUBLIC_URL;
const allowed = devOrigin ? [devOrigin] : [];

const nextConfig = {
  // Silence warnings
  // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  experimental: {
    // Allow dev assets loading when using a different origin (e.g., ngrok)
    allowedDevOrigins: allowed,
  },
};

export default nextConfig;
