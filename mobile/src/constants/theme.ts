/**
 * Restaurant Smart POS Design System & Mobile Tokens
 */
export const COLORS = {
  // Brand Primary & Accents
  primary: '#3B82F6',       // Electric Blue / Sapphire
  primaryDark: '#1D4ED8',
  primaryLight: '#93C5FD',
  primaryMuted: '#EFF6FF',
  
  // Backgrounds & Surfaces
  background: '#F8FAFC',    // Slate 50
  surface: '#FFFFFF',       // Pure white card
  surfaceElevated: '#FFFFFF',
  surfaceMuted: '#F1F5F9',   // Slate 100
  
  // Dark / Premium Slate Palette
  darkBackground: '#0F172A', // Slate 900
  darkSurface: '#1E293B',    // Slate 800
  darkBorder: '#334155',     // Slate 700

  // Typography
  textPrimary: '#0F172A',    // Slate 900
  textSecondary: '#64748B',  // Slate 500
  textMuted: '#94A3B8',      // Slate 400
  textInverse: '#FFFFFF',

  // Status Colors (Matching backend TableStatus & OrderStatus)
  status: {
    available: '#10B981',    // Emerald Green
    occupied: '#EF4444',     // Coral Red
    reserved: '#F59E0B',     // Amber
    cleaning: '#8B5CF6',     // Purple
    outOfService: '#64748B', // Slate

    // Order / KOT statuses
    pending: '#F59E0B',      // Amber
    confirmed: '#3B82F6',    // Blue
    accepted: '#6366F1',     // Indigo
    preparing: '#8B5CF6',    // Purple
    ready: '#10B981',        // Green
    served: '#06B6D4',       // Cyan
    completed: '#10B981',    // Emerald
    cancelled: '#94A3B8',    // Gray
  },

  // Borders & Dividers
  border: '#E2E8F0',         // Slate 200
  borderDark: '#CBD5E1',     // Slate 300

  // Feedback
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  semibold: 'System',
  bold: 'System',
};
