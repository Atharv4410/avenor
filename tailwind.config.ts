import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F7F8FA",
        card: "#FFFFFF",
        ink: {
          DEFAULT: "#15171E",
          muted: "#5B6472",
          faint: "#8B93A3",
        },
        line: "#E3E6EB",
        // Primary interactive colour — buttons, links, active states, focus
        // rings, the wordmark. Kept separate from `brand` (below) so the
        // meaning of status colours never changes, only the look of chrome.
        accent: {
          50: "#EEF1FD",
          100: "#DEE4FB",
          200: "#BCC9F7",
          300: "#96A8F0",
          400: "#6D83E8",
          500: "#4C63DD",
          600: "#3B4FC4",
          700: "#2F3F9E",
          800: "#263277",
          900: "#1D2760",
        },
        // Semantic "success / paid / sent / positive" green. Unchanged in
        // meaning and value — only its use in purely-chrome contexts (the
        // old primary button colour etc.) moved to `accent` above.
        brand: {
          50: "#EEF5EE",
          100: "#D9EAD9",
          200: "#B4D4B4",
          300: "#8EBE8E",
          400: "#5F9F60",
          500: "#3E8240",
          600: "#2F6731",
          700: "#255127",
          800: "#1C3D1E",
          900: "#132914",
        },
        amber: {
          50: "#FDF6E8",
          100: "#FAEAC4",
          500: "#C98A1F",
          600: "#A66F16",
        },
        danger: {
          50: "#FBEAEA",
          100: "#F4CDCD",
          500: "#B4362F",
          600: "#942C26",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(21, 23, 30, 0.04), 0 1px 1px rgba(21, 23, 30, 0.03)",
        pop: "0 16px 40px rgba(21, 23, 30, 0.12), 0 4px 10px rgba(21, 23, 30, 0.05)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "toast-in": {
          from: { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 260ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 200ms ease-out both",
        "scale-in": "scale-in 180ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-right": "slide-in-right 220ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-left": "slide-in-left 220ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "toast-in": "toast-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both",
        float: "float 5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
