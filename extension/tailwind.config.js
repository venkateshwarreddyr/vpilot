/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fdf4f0",
          100: "#fbe8de",
          500: "#e8845a",
          600: "#d4693e",
          700: "#b8522c",
        },
      },
    },
  },
  plugins: [],
};
