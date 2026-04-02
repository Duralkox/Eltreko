/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        tlo: "#182229",
        panel: "#22303a",
        szklo: "rgba(34,48,58,0.92)",
        akcent: "#4ac46f",
        sukces: "#5bd487",
        ostrzezenie: "#d2a24c"
      },
      boxShadow: {
        szklo: "0 22px 48px rgba(6,10,14,0.45)"
      },
      backgroundImage: {
        gradientGlow:
          "radial-gradient(circle at 14% 18%, rgba(74,196,111,0.14), transparent 30%), radial-gradient(circle at 84% 12%, rgba(91,212,135,0.08), transparent 26%), radial-gradient(circle at 50% 100%, rgba(20,110,75,0.10), transparent 34%)"
      }
    }
  },
  plugins: []
};
