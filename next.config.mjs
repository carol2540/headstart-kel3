/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@azure/cosmos", "@azure-rest/ai-document-intelligence"],
  },
};

export default nextConfig;
