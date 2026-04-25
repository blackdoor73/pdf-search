"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production: Sentry.captureException(error)
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          background: "#0d0d0d",
          color: "#e8e8e8",
          fontFamily: "monospace",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem", maxWidth: "420px" }}>
          <AlertTriangle
            style={{
              width: "2.5rem",
              height: "2.5rem",
              color: "#e05252",
              margin: "0 auto 1rem",
            }}
          />
          <h1
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
              letterSpacing: "-0.5px",
            }}
          >
            Application error
          </h1>
          <p
            style={{
              fontSize: "0.75rem",
              color: "#9a9a9a",
              marginBottom: "1.5rem",
              lineHeight: 1.6,
            }}
          >
            {error.message || "An unexpected error occurred."}
            {error.digest && (
              <span style={{ display: "block", color: "#5a5a5a", marginTop: "0.25rem" }}>
                Error ID: {error.digest}
              </span>
            )}
          </p>
          <button
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "#f5c542",
              color: "#000",
              border: "none",
              padding: "0.625rem 1.25rem",
              fontFamily: "monospace",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "1px",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            <RefreshCw style={{ width: "0.875rem", height: "0.875rem" }} />
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
