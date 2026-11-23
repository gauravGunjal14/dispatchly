/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#12161C',
        amber: {
          DEFAULT: '#FFB400',
          hover: '#E5A200',
          active: '#CC9000',
        },
        concrete: '#EEF0F2',
        line: {
          DEFAULT: '#D9DDE2',
          subtle: '#E7EAEE',
        },
        status: {
          success: '#1E8E4E',
          'success-text': '#17753F',
          'success-tint': '#E9F4ED',
          info: '#2F5D8A',
          'info-tint': '#EAEFF3',
          warning: '#FFB400',
          'warning-tint': '#FFF6E0',
          danger: '#C8372D',
          'danger-text': '#B92E25',
          'danger-tint': '#FAEBEA',
        },
      },
      fontFamily: {
        headline: ['var(--font-archivo)', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['var(--font-public-sans)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        control: '6px',
        panel: '12px',
      },
      boxShadow: {
        floating: '0 4px 20px -2px rgba(18, 22, 28, 0.08), 0 1px 3px 0 rgba(18, 22, 28, 0.04)',
      },
    },
  },
  plugins: [],
};
