/**
 * Coarse user-agent parsing for telemetry enrichment.
 *
 * Deliberately regex-ladder simple — we only need bucket-level accuracy
 * for the admin dashboard, not full UA-parser fidelity. Order matters:
 * Edge/Opera/Samsung UAs also contain "Chrome/", and Chrome UAs contain
 * "Safari/", so the more specific checks come first. Same for OS: iOS
 * before macOS (iPads may report "like Mac OS X"), Android before Linux.
 */

export interface ParsedUa {
  device: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
}

export function parseUa(ua: string): ParsedUa {
  const device = /iPad|Tablet/i.test(ua)
    ? "tablet"
    : /Mobi|Android|iPhone/i.test(ua)
    ? "mobile"
    : "desktop";

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
    ? "Opera"
    : /SamsungBrowser/.test(ua)
    ? "Samsung Internet"
    : /Firefox\//.test(ua)
    ? "Firefox"
    : /Chrome\//.test(ua)
    ? "Chrome"
    : /Safari\//.test(ua)
    ? "Safari"
    : "Other";

  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
    ? "Android"
    : /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X|Macintosh/.test(ua)
    ? "macOS"
    : /CrOS/.test(ua)
    ? "ChromeOS"
    : /Linux/.test(ua)
    ? "Linux"
    : "Other";

  return { device, browser, os };
}
