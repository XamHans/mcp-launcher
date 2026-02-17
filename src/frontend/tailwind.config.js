/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // Light theme colors
        background: '#ffffff',
        foreground: '#09090b',
        card: '#ffffff',
        'card-foreground': '#09090b',
        popover: '#ffffff',
        'popover-foreground': '#09090b',
        primary: '#09090b',
        'primary-foreground': '#fafafa',
        secondary: '#f4f4f5',
        'secondary-foreground': '#09090b',
        muted: '#f4f4f5',
        'muted-foreground': '#71717a',
        accent: '#f4f4f5',
        'accent-foreground': '#09090b',
        destructive: '#ef4444',
        'destructive-foreground': '#fafafa',
        border: '#e4e4e7',
        input: '#e4e4e7',
        ring: '#18181b',
        warning: '#f59e0b',
        success: '#22c55e',
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
}
