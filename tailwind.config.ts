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
        paper: "#FAF8F3",
        card: "#FFFFFF",
        ink: {
          DEFAULT: "#1F2420",
          muted: "#5B6760",
          faint: "#8B948D",
        },
        line: "#E6E2D8",
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
        card: "0 1px 2px rgba(31, 36, 32, 0.04), 0 1px 1px rgba(31, 36, 32, 0.03)",
        pop: "0 8px 24px rgba(31, 36, 32, 0.10)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
    },
  },
  plugins: [],
};

export default config;
