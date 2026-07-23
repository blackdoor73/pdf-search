import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { Analytics } from "@/components/Analytics";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { siteUrl } from "@/lib/seo/site";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.png",
  },
  title: {
    default: "PDFSearch — Free Online PDF Search Tool | Search Inside PDFs Instantly",
    template: "%s | PDFSearch",
  },
  description:
    "Search across multiple PDF files simultaneously — free, instant, and 100% private. Upload PDFs or paste URLs and find any word or phrase in seconds. No signup required.",
  keywords: [
    "search in PDF",
    "PDF search tool",
    "search text inside PDF",
    "find words in PDF online",
    "search across multiple PDFs",
    "free PDF search engine",
    "document search tool",
    "search PDF online free",
    "PDF text search",
    "full text search PDF",
    "search multiple PDF files",
    "PDF word search",
    "find text in PDF",
    "online PDF search",
  ],
  authors: [{ name: "PDFSearch", url: siteUrl }],
  creator: "PDFSearch",
  publisher: "PDFSearch",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "PDFSearch",
    title: "PDFSearch — Search Inside Any PDF, Instantly & Free",
    description:
      "Upload PDFs or paste URLs and search all of them at once. Find any word or phrase across thousands of pages in seconds. 100% private — nothing leaves your browser.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "PDFSearch — Free Online PDF Search Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PDFSearch — Search Inside Any PDF, Instantly & Free",
    description:
      "Upload PDFs or paste URLs and search all of them at once. 100% private — nothing leaves your browser.",
    images: ["/opengraph-image"],
    creator: "@pdfsearch",
  },
  category: "technology",
  verification: {
    google: "tmJl7JqVnRiBV1uktbsNDiswdYYbIBcDMfO1F5AL55c",
    // Bing Webmaster Tools — set NEXT_PUBLIC_BING_VERIFICATION to the
    // msvalidate.01 content value; omitted entirely when unset.
    ...(process.env.NEXT_PUBLIC_BING_VERIFICATION
      ? { other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_VERIFICATION } }
      : {}),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "PDFSearch",
    url: siteUrl,
    description:
      "Free online tool to search text inside multiple PDF files simultaneously. Upload PDFs or paste URLs and find any word or phrase instantly.",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Search across multiple PDFs simultaneously",
      "Upload PDF files or paste URLs",
      "100% private — files never leave your browser",
      "No signup or account required",
      "Full-text search with highlighting",
      "Export results as CSV",
      "Case-sensitive and whole-word search options",
    ],
    screenshot: `${siteUrl}/opengraph-image`,
    // NOTE: no aggregateRating — Google's structured-data policy requires
    // ratings to come from real, displayed user reviews. Add one only if a
    // genuine review mechanism ever exists.
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PDFSearch",
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    sameAs: [],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "PDFSearch",
    url: siteUrl,
    description: "Free online PDF search tool — search text inside any PDF instantly",
    // No SearchAction: the app has no site-search results pages (the in-app
    // search runs client-side over the user's own files, and /?q= is not
    // handled), so advertising one would be a broken rich-result target.
  };

  return (
    <html
      lang="en"
      className={`${plexMono.variable} ${plexSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body>
        <ToastProvider>
          {children}
          <FeedbackWidget />
        </ToastProvider>
        <Analytics />
      </body>
    </html>
  );
}
