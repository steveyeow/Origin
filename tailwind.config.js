/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['var(--font-space-grotesk)', 'Space Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
        'mono': ['var(--font-fira-code)', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
