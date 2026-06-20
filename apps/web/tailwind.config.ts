import type { Config } from 'tailwindcss';

/**
 * Design system — institutional, security-serious. Restrained palette using the
 * product's semantics: purple = Specter/decision, green = safe/allowed,
 * red = blocked/attack, amber = review/held, neutral grays = agents & records.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  // Status colors are sometimes composed at runtime (verdict bars, toggles), so
  // safelist the semantic color utilities the JIT scanner can't see statically.
  safelist: [
    'text-safe',
    'text-block',
    'text-review',
    'text-specter-soft',
    'text-specter',
    'bg-safe/10',
    'bg-block/10',
    'bg-review/10',
    'bg-specter/10',
    'bg-specter/30',
    'bg-safe/30',
    'bg-block/30',
    'border-safe/30',
    'border-block/30',
    'border-review/30',
    'border-specter/30',
    'border-safe/40',
    'border-block/40',
    'border-review/40',
    'border-specter/40',
    'border-specter/60',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#08090c',
        panel: '#0e1014',
        'panel-2': '#13161c',
        line: '#1d2128',
        ink: '#e7e9ee',
        'ink-dim': '#9aa1ad',
        'ink-faint': '#5b626e',
        specter: {
          DEFAULT: '#8b5cf6',
          soft: '#a78bfa',
          deep: '#6d28d9',
          glow: 'rgba(139,92,246,0.16)',
        },
        safe: { DEFAULT: '#34d399', deep: '#059669', glow: 'rgba(52,211,153,0.14)' },
        block: { DEFAULT: '#f87171', deep: '#dc2626', glow: 'rgba(248,113,113,0.16)' },
        review: { DEFAULT: '#fbbf24', deep: '#d97706', glow: 'rgba(251,191,36,0.14)' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(139,92,246,0.25), 0 8px 40px rgba(139,92,246,0.12)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { boxShadow: '0 0 0 0 rgba(139,92,246,0.5)' },
          '70%': { boxShadow: '0 0 0 10px rgba(139,92,246,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(139,92,246,0)' },
        },
        'flow-down': {
          '0%': { transform: 'translateY(-6px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.8s infinite',
        'flow-down': 'flow-down 0.4s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
