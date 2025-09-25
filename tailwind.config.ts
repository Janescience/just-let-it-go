import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Kanit', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "#e5e7eb",
        primary: {
          50: '#f9f9f9',
          100: '#f3f3f3',
          200: '#e6e6e6',
          300: '#d3d3d3',
          400: '#b3b3b3',
          500: '#808080',
          600: '#666666',
          700: '#4d4d4d',
          800: '#333333',
          900: '#1a1a1a',
          950: '#0d0d0d',
        },
      },
      screens: {
        'tablet': '768px',
        'laptop': '1024px',
        'desktop': '1280px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
};

export default config;