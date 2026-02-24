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
        olive:      "#4A7C59",
        "olive-deep":"#3A6347",
        "olive-pale":"#EBF3EE",
        "olive-mid": "#C2DBC9",
        sand:       "#C9A96E",
        "sand-light":"#F7F0E4",
        confirm:    "#2D9E5F",
        ink:        "#1A1F2E",
        slate:      "#556070",
        mist:       "#96A3AF",
        border:     "#E4EAF0",
        fog:        "#F4F7F9",
      },
      fontFamily: {
        display: ["var(--font-tajawal)", "sans-serif"],
        body:    ["var(--font-ibm-arabic)", "sans-serif"],
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
