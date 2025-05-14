import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
  },
}

export default nextConfig