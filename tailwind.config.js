/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#E8F2FC',
          100: '#C9E1F8',
          200: '#A8CFF3',
          300: '#7BB6EC',
          400: '#4D9CE7',
          500: '#2383E2',
          600: '#1A6FC7',
          700: '#155CA8',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          50: '#FDECEC',
          300: '#F5C2C2',
          500: '#E03E3E',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        neutral: {
          0: '#FFFFFF',
          50: '#FBFBFA',
          100: '#F7F6F3',
          150: '#F1F1EF',
          200: '#E9E9E7',
          300: '#DCDCDA',
          400: '#C7C7C2',
          500: '#9B9A97',
          600: '#787774',
          700: '#5C5B57',
          900: '#37352F',
          1000: '#1F1E1B',
        },
        success: {
          50: '#E6F4EA',
          300: '#7BC79A',
          500: '#0F9D58',
        },
        warning: {
          50: '#FBEFE0',
          300: '#F0BC7A',
          500: '#D9730D',
        },
        priority: {
          low: '#9B9A97',
          normal: '#2383E2',
          high: '#D9730D',
          urgent: '#E03E3E',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'SF Pro Display', 'Microsoft YaHei UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Cascadia Mono', 'Consolas', 'monospace'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'slide-in': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
        'fade-in': 'fade-in 0.15s ease-out',
      },
    },
  },
  plugins: [],
}
