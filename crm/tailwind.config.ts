import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './offers/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(210 100% 6%)' },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        brand: { ink: '#002040', surface: '#204060', accent: '#4080E0', soft: '#80A0E0' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      keyframes: {
        'collapsible-down': { from: { height: '0' }, to: { height: 'var(--radix-collapsible-content-height)' } },
        'collapsible-up': { from: { height: 'var(--radix-collapsible-content-height)' }, to: { height: '0' } },
      },
      animation: { 'collapsible-down': 'collapsible-down 0.2s ease-out', 'collapsible-up': 'collapsible-up 0.2s ease-out' },
      borderRadius: { xl: 'calc(var(--radius) + 4px)', lg: 'var(--radius)', md: 'calc(var(--radius) - 4px)', sm: 'calc(var(--radius) - 6px)' },
      fontFamily: {
        sans: ['var(--font-sans)', '"DM Sans"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['var(--font-mono)', '"DM Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        // the landing page's three elevations
        xs: 'var(--sh-1)',
        sm: 'var(--sh-1)',
        DEFAULT: 'var(--sh-1)',
        md: 'var(--sh-2)',
        lg: 'var(--sh-2)',
        xl: 'var(--sh-3)',
        '2xl': 'var(--sh-3)',
      },
      transitionTimingFunction: { out: 'cubic-bezier(0.19, 1, 0.22, 1)' },
    },
  },
  plugins: [
    // Tailwind 4 style boolean data-attribute variants and the `**` descendant variant used by the vendored event calendar
    plugin(({ addVariant }) => {
      for (const n of ['open', 'closed', 'disabled', 'dragging', 'horizontal', 'inset', 'loading', 'popup-open', 'selected', 'today', 'vertical']) addVariant(`data-${n}`, `&[data-${n}]`)
      addVariant('**', '& *')
    }),
  ],
}

export default config
