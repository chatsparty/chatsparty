import typography from "@tailwindcss/typography";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  plugins: [typography],
  theme: {
    extend: {
      screens: {
        'rtl': { 'raw': '[dir="rtl"]' },
        'ltr': { 'raw': '[dir="ltr"]' },
      },
    },
  },
};
