/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["var(--font-mono)", "'IBM Plex Mono'", "monospace"],
        sans: ["var(--font-sans)", "'IBM Plex Sans'", "sans-serif"],
      },
      colors: {
        bg: "#0d0d0d",
        surface: "#161616",
        surface2: "#1f1f1f",
        border: "#2a2a2a",
        border2: "#383838",
        accent: "#f5c542",
        "accent-hover": "#e8b93a",
        text: "#e8e8e8",
        "text-2": "#9a9a9a",
        "text-3": "#5a5a5a",
        green: "#4caf79",
        red: "#e05252",
        blue: "#5b9cf6",
      },
      animation: {
        "slide-in": "slideIn 0.2s ease forwards",
        "fade-up": "fadeUp 0.4s ease forwards",
        "pulse-accent": "pulseAccent 2s ease-in-out infinite",
      },
      keyframes: {
        slideIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseAccent: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [],
};
