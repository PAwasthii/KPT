import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Derive __dirname in ESM context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env file
// This allows us to use a centralized .env for the entire monorepo
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure the shared UI package and DB package are transpiled by Next/Turbopack
  transpilePackages: ["@repo/ui", "@repo/db", "lucide-react"],

  // Optimize package imports for better tree-shaking
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  // Disable symlink resolution to prevent EINVAL on Windows + OneDrive
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },


  // Image optimization configuration
  images: {
    formats: ["image/webp", "image/avif"],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.s3.*.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },

  // Server configuration
  serverExternalPackages: [],

  // Ignore ESLint during builds to prevent CI failures
  // ESLint should be run separately via `npm run lint`
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Ignore TypeScript errors during builds (optional, but recommended for CI)
  typescript: {
    ignoreBuildErrors: false, // Keep this as false to catch TS errors
  },
};

export default nextConfig;
