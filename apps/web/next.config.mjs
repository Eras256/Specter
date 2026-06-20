import path from 'node:path';

// Conservative security headers — applied to every response by Vercel/Next.
// (No strict CSP here: it would fight Next's inline runtime + Tailwind; the site
// ships no secrets, so these headers are the high-value, zero-breakage set.)
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root so Next doesn't mis-infer it from a stray lockfile
  // higher up the tree (this is the pnpm monorepo root).
  turbopack: {
    root: path.join(import.meta.dirname, '..', '..'),
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
