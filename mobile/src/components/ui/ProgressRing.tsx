import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Typography } from '@/theme';

interface Props {
  consumed: number;
  target: number;
  size?: number;
  strokeWidth?: number;
}

function getRingColor(ratio: number): string {
  if (ratio <= 0.85) return Colors.brand[500];   // under — green
  if (ratio <= 1.0)  return Colors.brand[400];   // close — lighter green
  if (ratio <= 1.15) return Colors.warning;       // slightly over — amber
  return Colors.error;                            // very over — red
}

export function ProgressRing({ consumed, target, size = 160, strokeWidth = 12 }: Props) {
  const theme = useTheme();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = target > 0 ? Math.min(consumed / target, 1) : 0;
  const strokeDashoffset = circumference * (1 - ratio);
  const ringColor = getRingColor(target > 0 ? consumed / target : 0);
  const remaining = Math.max(0, target - consumed);

  return (
    <View style={styles.wrapper}>
      <Svg width={size} height={size}>
        {/* track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.border.default}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* progress */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* center content */}
      <View style={[styles.center, { width: size, height: size }]}>
        <Text style={[styles.consumed, { color: theme.text.primary }]}>
          {Math.round(consumed)}
        </Text>
        <Text style={[styles.label, { color: theme.text.secondary }]}>kcal</Text>
        <View style={[styles.divider, { backgroundColor: theme.border.default }]} />
        <Text style={[styles.remaining, { color: theme.text.secondary }]}>
          {consumed > target
            ? `+${Math.round(consumed - target)} extra`
            : `${Math.round(remaining)} restantes`
          }
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  consumed: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes['3xl'],
    letterSpacing: -1,
    lineHeight: 36,
  },
  label: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
  },
  divider: {
    width: 32,
    height: 1,
    marginVertical: 4,
  },
  remaining: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.xs,
  },
});
