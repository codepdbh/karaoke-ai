import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0b0d0f",
          900: "#121614",
          800: "#1c211d"
        },
        accent: {
          500: "#f59e0b",
          400: "#fbbf24"
        },
        neon: {
          500: "#34d399"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(52, 211, 153, 0.16), 0 18px 60px rgba(0, 0, 0, 0.35)",
        panel: "0 18px 60px rgba(0, 0, 0, 0.26)"
      }
    }
  },
  plugins: []
};

export default config;
