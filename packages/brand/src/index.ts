// @bobby/brand — Programmatic access to design tokens

import tokens from './tokens.json' with { type: 'json' }

export const BOBBY_COLORS = {
  violet: '#9333EA',
  violet90: '#A855F7',
  violet50: '#9333EA80',
  violet20: '#9333EA33',
  bg: '#0A0A0F',
  bgCard: '#15151F',
  text: '#F4F4F8',
  textMuted: '#A1A1AA',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
} as const

export type BobbyColor = keyof typeof BOBBY_COLORS

export const DOT_MATRIX = {
  grid: 16,
  pitchPx: 18,
  radiusPx: 5,
  color: BOBBY_COLORS.violet,
} as const

export const TAILWIND_COLORS_EXTEND = {
  'bobby-violet': BOBBY_COLORS.violet,
  'bobby-violet-90': BOBBY_COLORS.violet90,
  'bobby-bg': BOBBY_COLORS.bg,
  'bobby-bg-card': BOBBY_COLORS.bgCard,
  'bobby-text': BOBBY_COLORS.text,
  'bobby-muted': BOBBY_COLORS.textMuted,
}

export { tokens as TOKENS }
