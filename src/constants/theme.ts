import { StyleSheet } from 'react-native';

export type ColorPalette = typeof DarkColors;

export const DarkColors = {
  primary: '#FF7A00',
  primaryLight: 'rgba(255, 122, 0, 0.15)',
  primaryBorder: 'rgba(255, 122, 0, 0.2)',
  primaryShadow: 'rgba(255, 122, 0, 0.4)',
  primaryMuted: 'rgba(255, 122, 0, 0.30)',

  background: '#121212',
  card: '#1E1E1E',
  field: '#1A1A1A',
  surface: '#161616',

  text: '#E0E0E0',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textMuted: '#475569',
  white: '#FFFFFF',
  black: '#000000',

  border: '#2D2D2D',
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  borderPrimary: 'rgba(255, 123, 0, 0.15)',

  success: '#22C55E',
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.1)',
  errorBorder: 'rgba(239, 68, 68, 0.2)',
  warning: '#F59E0B',

  tabInactive: '#64748B',
  overlay: 'rgba(0, 0, 0, 0.4)',

  shadow: '#000000',
  cardShadowOpacity: 0.15,
  statusBarStyle: 'light' as const,
} as const;

export const LightColors: ColorPalette = {
  primary: '#FF7A00',
  primaryLight: 'rgba(255, 122, 0, 0.08)',
  primaryBorder: 'rgba(255, 122, 0, 0.15)',
  primaryShadow: 'rgba(255, 122, 0, 0.25)',
  primaryMuted: 'rgba(255, 122, 0, 0.15)',

  background: '#F5F4F2',
  card: '#FFFFFF',
  field: '#EFEEEC',
  surface: '#FAFAF9',

  text: '#1C1917',
  textSecondary: '#57534E',
  textTertiary: '#78716C',
  textMuted: '#A8A29E',
  white: '#FFFFFF',
  black: '#000000',

  border: '#E7E5E4',
  borderSubtle: 'rgba(0, 0, 0, 0.06)',
  borderPrimary: 'rgba(255, 123, 0, 0.12)',

  success: '#16A34A',
  error: '#DC2626',
  errorLight: 'rgba(220, 38, 38, 0.06)',
  errorBorder: 'rgba(220, 38, 38, 0.12)',
  warning: '#D97706',

  tabInactive: '#A8A29E',
  overlay: 'rgba(0, 0, 0, 0.25)',

  shadow: '#78716C',
  cardShadowOpacity: 0.08,
  statusBarStyle: 'dark' as const,
};

/** @deprecated Use useTheme().colors instead */
export const Colors = DarkColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
};

export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
} as const;

export function stringToColor(str: string, isDark = true): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return isDark ? `hsl(${hue}, 35%, 18%)` : `hsl(${hue}, 40%, 88%)`;
}

/** Creates themed SharedStyles. Call once per theme change, cache via useMemo. */
export function createSharedStyles(c: ColorPalette) {
  return StyleSheet.create({
    screenContainer: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderSubtle,
    },
    headerTitle: {
      fontFamily: 'Inter_700Bold',
      fontSize: FontSize.xl,
      color: c.text,
      letterSpacing: -0.3,
    },
    sectionLabel: {
      fontFamily: 'Inter_700Bold',
      fontSize: FontSize.xs,
      color: c.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginLeft: 4,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: BorderRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
      overflow: 'hidden',
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      gap: Spacing.md,
    },
    emptyTitle: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: FontSize.lg,
      color: c.textSecondary,
    },
    emptySubtitle: {
      fontFamily: 'Inter_400Regular',
      fontSize: FontSize.md,
      color: c.textMuted,
      textAlign: 'center',
    },
    fab: {
      position: 'absolute',
      right: 24,
      bottom: 100,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 8,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
    },
    fabPressed: {
      transform: [{ scale: 0.95 }],
    },
    primaryButton: {
      backgroundColor: c.primary,
      paddingVertical: Spacing.lg,
      borderRadius: BorderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: Spacing.sm,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    primaryButtonText: {
      fontFamily: 'Inter_700Bold',
      fontSize: FontSize.md,
      color: c.white,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
      marginLeft: 52,
    },
  });
}
