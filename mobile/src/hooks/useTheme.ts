import { useColorScheme } from 'react-native';
import { DarkTheme, LightTheme, type Theme } from '@/theme';

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'light' ? LightTheme : DarkTheme;
}
