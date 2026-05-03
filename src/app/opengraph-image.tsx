import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "PDFSearch — Free Online PDF Search Tool";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0d0d0d",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px 96px",
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        {/* Grid background dots */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle, #f5c54218 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Logo badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              background: "#f5c542",
              width: "52px",
              height: "52px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "14px",
                fontWeight: "700",
                color: "#000",
                letterSpacing: "-0.5px",
              }}
            >
              PDF
            </span>
          </div>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "28px",
              fontWeight: "600",
              color: "#e8e8e8",
            }}
          >
            Search
            <span style={{ color: "#f5c542" }}>.</span>
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "62px",
            fontWeight: "700",
            color: "#e8e8e8",
            lineHeight: 1.05,
            letterSpacing: "-1.5px",
            marginBottom: "24px",
            maxWidth: "900px",
          }}
        >
          Search inside{" "}
          <span style={{ color: "#f5c542" }}>any PDF</span>
          <br />
          instantly. Free.
        </div>

        {/* Subheadline */}
        <div
          style={{
            fontSize: "24px",
            color: "#9a9a9a",
            lineHeight: 1.5,
            marginBottom: "48px",
            maxWidth: "720px",
          }}
        >
          Upload files or paste URLs — search across hundreds of PDFs at once.
          100% private, nothing leaves your browser.
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[
            "No signup required",
            "Up to 200 PDFs",
            "100% browser-based",
            "Free forever",
          ].map((badge) => (
            <div
              key={badge}
              style={{
                background: "#161616",
                border: "1px solid #2a2a2a",
                padding: "8px 16px",
                fontSize: "16px",
                color: "#9a9a9a",
                fontFamily: "monospace",
              }}
            >
              ✓ {badge}
            </div>
          ))}
        </div>

        {/* URL watermark */}
        <div
          style={{
            position: "absolute",
            bottom: "48px",
            right: "96px",
            fontSize: "18px",
            color: "#5a5a5a",
            fontFamily: "monospace",
          }}
        >
          pdfsearch.info
        </div>
      </div>
    ),
    { ...size }
  );
}
