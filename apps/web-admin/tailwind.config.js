/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#23302f",
        quiet: "#657574",
        paper: "#f7f8f5",
        mint: "#d9eee6",
        spruce: "#1f6f61",
        river: "#477f9d",
        coral: "#d56a52",
        line: "#dde5df"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(35, 48, 47, 0.08)"
      }
    }
  },
  plugins: []
};
