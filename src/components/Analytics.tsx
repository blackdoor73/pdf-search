"use client";

/**
 * Site-wide analytics bootstrap. Mounted once in the root layout.
 *
 * - Fires session_start + page_view into our own telemetry pipeline.
 * - Reports Core Web Vitals (powers the admin System panel).
 * - Captures uncaught client errors (powers the error-rate panel).
 * - Loads GA4 gtag if NEXT_PUBLIC_GA_ID is set.
 * - Loads Microsoft Clarity if NEXT_PUBLIC_CLARITY_ID is set.
 */

import { useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { track } from "@/lib/analytics/client";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    // session_start is emitted automatically by the tracker whenever an
    // event opens a new 30-min-inactivity session — no per-tab bookkeeping.
    track("page_view", { path: pathname ?? "/" });
    if (GA_ID && typeof window.gtag === "function") {
      window.gtag("config", GA_ID, { page_path: pathname });
    }
  }, [pathname]);

  useReportWebVitals((metric) => {
    // Only the stable, decision-driving vitals — keeps event volume low.
    if (!["LCP", "CLS", "INP", "TTFB", "FCP"].includes(metric.name)) return;
    track("web_vital", {
      name: metric.name,
      value: Math.round(metric.value * 1000) / 1000,
      rating: metric.rating ?? "",
    });
  });

  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      track("client_error", {
        message: String(e.message ?? "unknown").slice(0, 200),
        source: `${e.filename ?? ""}:${e.lineno ?? 0}`.slice(0, 200),
      });
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      track("client_error", {
        message: String(e.reason?.message ?? e.reason ?? "unhandled rejection").slice(0, 200),
        source: "unhandledrejection",
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (!GA_ID && !CLARITY_ID) return null;

  return (
    <>
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { anonymize_ip: true });`}
          </Script>
        </>
      )}
      {CLARITY_ID && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_ID}");`}
        </Script>
      )}
    </>
  );
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
