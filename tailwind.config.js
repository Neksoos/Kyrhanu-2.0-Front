/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /**
       * Colour palette inspired by traditional Ukrainian embroidery. A light
       * cream background contrasts with vibrant reds and earthy browns. These
       * hues give the interface a warm and hand‑crafted feel while still
       * providing sufficient contrast for readability. If you need the old
       * colours, they can easily be restored by reverting these values.
       */
      colors: {
        kurgan: {
          bg: '#f8f4e1',
          card: '#fff7e6',
          accent: '#b30c12',
          'accent-dim': '#7c0a0e',
          text: '#2d2926',
          muted: '#705c53',
          border: '#cfa77d',
          danger: '#8b0a02',
          success: '#4a7c59',
        },
      },
      fontFamily: {
        /**
         * Pixelated typeface that evokes retro video games. It pairs well
         * with the pixel art border and embroidery patterns used in the UI.
         */
        pixel: ['"Press Start 2P"', 'monospace'],
        // Fallback serif font remains available for other elements.
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
      /**
       * Allow usage of a repeating pixel pattern as a background. The
       * underlying file should live in the public folder (e.g.,
       * ``/pixel-embroidered.png``). You can then apply it via
       * ``bg-pixel-pattern`` utility classes.
       */
      backgroundImage: {
        'pixel-pattern': "url('/pixel-embroidered.png')",
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        shake: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
      },
      keyframes: {
        shake: {
          '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
          '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
          '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
          '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
        },
      },
    },
  },
  plugins: [],
}
