import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { homepageFaqSchema, homepageHowToSchema } from "./seo-schemas";

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

const siteUrl = "https://www.pdfsearch.info";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
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
    "AI PDF search",
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
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.9",
      reviewCount: "1240",
      bestRating: "5",
      worstRating: "1",
    },
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
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageFaqSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageHowToSchema) }}
        />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
