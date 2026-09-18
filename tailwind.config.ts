import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        civic: {
          slate: "#0f172a",
          dark: "#0b1120",
          card: "#1e293b",
          border: "#334155",
          blue: "#2563eb",
          "blue-hover": "#1d4ed8",
        },
        status: {
          pending: "#f43f5e",
          assigned: "#0284c7",
          submitted: "#f59e0b",
          resolved: "#10b981",
          escalated: "#dc2626",
          reopened: "#8b5cf6",
          rejected: "#64748b",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
