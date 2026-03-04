import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#09090f",
          900: "#11111a",
          800: "#171726"
        },
        accent: {
          500: "#f97316",
          400: "#fb923c"
        },
        neon: {
          500: "#22d3ee"
        }
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(34, 211, 238, 0.16), 0 18px 60px rgba(9, 9, 15, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;

