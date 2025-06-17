import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  plugins: [typography],
} satisfies Config