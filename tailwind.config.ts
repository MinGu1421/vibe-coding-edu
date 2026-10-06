/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        pastel: {
          blue: "#E0F2FE",
          yellow: "#FEF9C3",
          pink: "#FCE7F3",
          green: "#DCFCE7",
          purple: "#F3E8FF",
          orange: "#FFEDD5",
        },
      },
      fontFamily: {
        kids: ['"Pretendard"', '"Comic Sans MS"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
