/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',  /* primary — Encora teal */
          700: '#0f766e',  /* hover */
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        secondary: {
          400: '#ff6584',  /* pink accent — highlights */
          500: '#ff4d70',
          600: '#e8526e',  /* hover */
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'design-sm':    '0 1px 2px rgba(0,0,0,0.05)',
        'design-md':    '0 2px 8px rgba(0,0,0,0.08)',
        'design-lg':    '0 4px 16px rgba(0,0,0,0.12)',
        'design-hover': '0 8px 24px rgba(0,0,0,0.15)',
        'card-page':    '0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
      },
      letterSpacing: {
        'heading': '-0.02em',
        'body':    '-0.011em',
      },
      lineHeight: {
        'heading': '1.2',
        'body':    '1.65',
      },
      transitionDuration: {
        'fast':   '150',
        'normal': '250',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
