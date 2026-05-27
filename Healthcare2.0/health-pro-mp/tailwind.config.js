/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{html,js,ts,jsx,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'primary-client': '#10b981',
        'primary-practitioner': '#1e293b',
        'bg-main': '#f8fafc',
      }
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  }
}
