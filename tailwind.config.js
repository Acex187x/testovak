/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        background: "#f5f5f5",
        popover: "#f9f9f9",
        primary: "#48a13b",
        "primary-foreground": "#ffffff",
        accent: "#0c58ef",
        "accent-foreground": "#ffffff",
      },
    },
  },
  plugins: [],
};
