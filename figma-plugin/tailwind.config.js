/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/ui/**/*.{js,ts,jsx,tsx}",
    "./src/ui/index.html",
  ],
  theme: {
    extend: {
      colors: {
        figma: {
          bg: '#2c2c2c',
          surface: '#383838',
          border: '#444444',
          text: '#ffffff',
          'text-secondary': '#b3b3b3',
          blue: '#18a0fb',
          'blue-hover': '#0d90ea',
          purple: '#7b61ff',
          red: '#f24822',
          green: '#1bc47d',
        }
      },
      fontSize: {
        'figma-xs': '11px',
        'figma-sm': '12px',
        'figma-base': '13px',
      },
      spacing: {
        'figma-xs': '4px',
        'figma-sm': '8px',
        'figma-md': '12px',
        'figma-lg': '16px',
        'figma-xl': '24px',
      },
      borderRadius: {
        'figma': '6px',
      }
    },
  },
  plugins: [],
}