// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080810",
        surface: "#12121a",
        "surface-2": "#1a1a28",
        border: "#2a2a3d",
        primary: "#7c3aed",
        "primary-glow": "#9f5ff7",
        secondary: "#06b6d4",
        "neon-green": "#22d3a5",
        "neon-orange": "#f97316",
        text: "#e2e8f0",
        muted: "#64748b",
      },
      fontFamily: {
        outfit: ["var(--font-outfit)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "live-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.2)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.3s ease-out forwards",
        "live-pulse": "live-pulse 1.2s ease-in-out infinite",
        "slide-in": "slide-in 0.2s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
