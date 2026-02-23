/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#18181B",    // Zinc 900
        accent: "#10B981",     // Emerald 500 for terminal/success feel
        background: "#09090B", // Zinc 950 (Deep dark)
        foreground: "#FAFAFA", // Zinc 50 (Off white)
        card: "#121214",       // Slightly lighter than bg
        borderline: "#27272A", // Zinc 800
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
        drama: ['"Space Grotesk"', 'sans-serif'], // Replacing serif with heavy sans
        mono: ['"Fira Code"', 'monospace'],
      },
    },
  },
  plugins: [],
}
