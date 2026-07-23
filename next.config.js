/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Compress responses for better Core Web Vitals
  compress: true,

  // Power headers and security applied to every response
  async headers() {
    return [
      {
        // Long-lived cache for static assets (images, fonts, JS chunks)
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Cache SEO/content pages for 1 hour at CDN edge
        source:
          "/(how-to-search-pdf|search-multiple-pdfs|pdf-search-online|search-text-in-pdf|find-words-in-pdf|free-pdf-search-engine|search-scanned-pdf|bulk-pdf-search|search-government-documents|search-technical-manuals|pdf-search-for-students|pdf-search-for-researchers|pdf-search-for-lawyers|pdf-search-for-finance|pdf-search-for-recruiters|pdf-search-for-engineers|blog|changelog)(.*)",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=3600, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            // pdf.js worker is self-hosted (scripts/copy-pdf-worker.mjs), so
            // cdnjs is gone. GA4 + Microsoft Clarity are allowed — both load
            // only when their NEXT_PUBLIC_* env vars are set.
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://www.googletagmanager.com https://www.clarity.ms",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "img-src 'self' data: blob: https://*.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms",
              "worker-src 'self' blob:",
              "connect-src 'self' https://*.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
