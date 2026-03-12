import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "lm-bg": "#0B0712",
        "lm-sidebar": "#120A1F",
        "lm-card": "#1A112B",
        "lm-border": "#3A1F66",
        "lm-primary": "#7C3AED",
        "lm-primary-strong": "#8B5CF6",
        "lm-text": "#F5F7FB",
        "lm-text-muted": "#94A3B8",
        "lm-text-subtle": "#64748B",
        "lm-positive": "#34D399",
        "lm-negative": "#FB7185",
        "lm-danger": "#F43F5E",
      },
    },
  },
  plugins: [],
};

export default config;
