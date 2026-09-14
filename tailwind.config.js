/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  safelist: [
    { pattern: /bg-(brand|emerald|blue|amber|rose|indigo)-(50|100|200|300|400|500|600|700|800|900|950)/ },
    { pattern: /text-(brand|emerald|blue|amber|rose|indigo)-(50|100|200|300|400|500|600|700|800|900|950)/ },
    { pattern: /border-(brand|emerald|blue|amber|rose|indigo)-(50|100|200|300|400|500|600|700|800|900|950)/ },
  ],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-50, #EEF2FF)',
          100: 'var(--brand-100, #E0E7FF)',
          200: 'var(--brand-200, #C7D2FE)',
          300: 'var(--brand-300, #A5B4FC)',
          400: 'var(--brand-400, #818CF8)',
          500: 'var(--brand-500, #6366F1)',
          600: 'var(--brand-600, #4F46E5)',
          700: 'var(--brand-700, #4338CA)',
          800: 'var(--brand-800, #3730A3)',
          900: 'var(--brand-900, #312E81)',
          950: 'var(--brand-950, #1E1B4B)',
        },
        accent: {
          50: 'var(--brand-accent-50, #F5F3FF)',
          100: 'var(--brand-accent-100, #EDE9FE)',
          200: 'var(--brand-accent-200, #DDD6FE)',
          300: 'var(--brand-accent-300, #C4B5FD)',
          400: 'var(--brand-accent-400, #A78BFA)',
          500: 'var(--brand-accent-500, #8B5CF6)',
          600: 'var(--brand-accent-600, #7C3AED)',
          700: 'var(--brand-accent-700, #6D28D9)',
          800: 'var(--brand-accent-800, #5B21B6)',
          900: 'var(--brand-accent-900, #4C1D95)',
          950: 'var(--brand-accent-950, #2E1065)',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#111827',
          subtleLight: '#F7F8FA',
          subtleDark: '#0B0F19',
          borderLight: '#E5E7EB',
          borderDark: '#1F2937',
        }
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, var(--brand-600, #4F46E5) 0%, var(--brand-accent-500, #8B5CF6) 100%)',
        'gradient-brand-hover': 'linear-gradient(135deg, var(--brand-700, #4338CA) 0%, var(--brand-accent-600, #7C3AED) 100%)',
        'gradient-brand-subtle': 'linear-gradient(135deg, var(--brand-50, #EEF2FF) 0%, var(--brand-accent-50, #F5F3FF) 100%)',
        'gradient-brand-subtle-dark': 'linear-gradient(135deg, var(--brand-950, #1E1B4B) 0%, var(--brand-accent-950, #2E1065) 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        // Soft, neutral elevation — no colored "glow" shadows. A clean SaaS
        // surface separates from the page with shadow + a hairline border,
        // not a brand-colored halo.
        card: '0 1px 2px 0 rgba(16, 24, 40, 0.04)',
        cardHover: '0 4px 10px -2px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.05)',
        glow: '0 1px 2px 0 rgba(16, 24, 40, 0.04)',
        brand: '0 1px 2px 0 rgba(var(--brand-glow-rgb, 79, 70, 229), 0.20)',
      },
    },
  },
  plugins: [],
}
