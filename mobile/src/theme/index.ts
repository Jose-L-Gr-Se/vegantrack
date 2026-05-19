// Design tokens — single source of truth for the entire app visual system

export const Colors = {
  // Brand — verde consciente
  brand: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',   // primary action
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Neutrals — dark-first (app will be dark-first)
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    850: '#1a1a1a',
    900: '#111111',
    950: '#0a0a0a',   // darkest background
  },

  // Semantic
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',

  // Transparent
  overlay: 'rgba(0, 0, 0, 0.6)',
} as const;

// Light theme
export const LightTheme = {
  background: {
    primary: Colors.neutral[50],
    secondary: Colors.neutral[100],
    card: Colors.neutral[0],
    elevated: Colors.neutral[0],
  },
  text: {
    primary: Colors.neutral[900],
    secondary: Colors.neutral[500],
    tertiary: Colors.neutral[400],
    inverse: Colors.neutral[0],
  },
  border: {
    default: Colors.neutral[200],
    subtle: Colors.neutral[100],
    strong: Colors.neutral[300],
  },
  action: {
    primary: Colors.brand[600],
    primaryText: Colors.neutral[0],
    secondary: Colors.brand[50],
    secondaryText: Colors.brand[700],
  },
  tab: {
    active: Colors.brand[600],
    inactive: Colors.neutral[400],
    background: Colors.neutral[0],
  },
} as const;

// Dark theme — default, app is dark-first
export const DarkTheme = {
  background: {
    primary: Colors.neutral[950],
    secondary: Colors.neutral[900],
    card: Colors.neutral[900],
    elevated: Colors.neutral[850],
  },
  text: {
    primary: Colors.neutral[50],
    secondary: Colors.neutral[400],
    tertiary: Colors.neutral[600],
    inverse: Colors.neutral[900],
  },
  border: {
    default: Colors.neutral[800],
    subtle: Colors.neutral[850],
    strong: Colors.neutral[700],
  },
  action: {
    primary: Colors.brand[500],
    primaryText: Colors.neutral[0],
    secondary: 'rgba(34, 197, 94, 0.12)',
    secondaryText: Colors.brand[400],
  },
  tab: {
    active: Colors.brand[500],
    inactive: Colors.neutral[600],
    background: Colors.neutral[950],
  },
} as const;

export interface Theme {
  background: {
    primary: string;
    secondary: string;
    card: string;
    elevated: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  border: {
    default: string;
    subtle: string;
    strong: string;
  };
  action: {
    primary: string;
    primaryText: string;
    secondary: string;
    secondaryText: string;
  };
  tab: {
    active: string;
    inactive: string;
    background: string;
  };
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const Typography = {
  // Font families (loaded via expo-font)
  fonts: {
    sans: 'DMSans_400Regular',
    sansMedium: 'DMSans_500Medium',
    sansSemiBold: 'DMSans_600SemiBold',
    sansBold: 'DMSans_700Bold',
  },

  // Scale
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 19,
    xl: 22,
    '2xl': 26,
    '3xl': 30,
    '4xl': 36,
  },

  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;
