import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Light mode surfaces
        alabaster: "#F8FAFC",
        surface: {
          light: "#FFFFFF",
          dark: "#1E293B",
        },
        border: {
          light: "#E2E8F0",
          dark: "#334155",
        },
        // Clinical Teal (Primary Brand)
        clinical: {
          50: "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
          900: "#134E4A",
        },
        // Text hierarchy
        "deep-slate": "#0F172A",
        "cool-slate": "#64748B",
        "charcoal-slate": "#1E293B",
        // Semantic accents
        semantic: {
          success: "#10B981",
          "success-bg": "#ECFDF5",
          "success-bg-dark": "rgba(16, 185, 129, 0.15)",
          warning: "#F59E0B",
          "warning-bg": "#FFFBEB",
          "warning-bg-dark": "rgba(245, 158, 11, 0.15)",
          critical: "#EF4444",
          "critical-bg": "#FEF2F2",
          "critical-bg-dark": "rgba(239, 68, 68, 0.15)",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      maxWidth: {
        dashboard: "1440px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
