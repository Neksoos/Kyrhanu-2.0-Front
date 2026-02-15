import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        pixel: "0 0 0 2px #111, 0 0 0 4px #f2f2f2"
      }
    }
  },
  plugins: []
} satisfies Config;