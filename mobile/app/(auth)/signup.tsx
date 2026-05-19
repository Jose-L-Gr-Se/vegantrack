import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/hooks/useTheme';
import { Colors, Spacing, Radius, Typography } from '@/theme';

export default function SignupScreen() {
  const theme = useTheme();
  const { signUp } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await signUp(email.trim(), password);
    if (error) setError(error);
    setLoading(false);
  };

  const s = styles(theme);

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.content}>
        <View style={s.header}>
          <Text style={s.logo}>🌱</Text>
          <Text style={s.title}>Empieza gratis</Text>
          <Text style={s.subtitle}>Crea tu cuenta en segundos</Text>
        </View>

        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="Correo electrónico"
            placeholderTextColor={theme.text.tertiary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={s.input}
            placeholder="Contraseña (mín. 6 caracteres)"
            placeholderTextColor={theme.text.tertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          {error && <Text style={s.error}>{error}</Text>}

          <TouchableOpacity
            style={[s.button, loading && s.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={theme.action.primaryText} />
              : <Text style={s.buttonText}>Crear cuenta</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>¿Ya tienes cuenta? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={s.link}>Entrar</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    justifyContent: 'center',
    gap: Spacing['2xl'],
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  logo: {
    fontSize: 56,
  },
  title: {
    fontFamily: Typography.fonts.sansBold,
    fontSize: Typography.sizes['3xl'],
    color: theme.text.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.base,
    color: theme.text.secondary,
  },
  form: {
    gap: Spacing.md,
  },
  input: {
    backgroundColor: theme.background.card,
    borderWidth: 1,
    borderColor: theme.border.default,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.base,
    color: theme.text.primary,
  },
  button: {
    backgroundColor: theme.action.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontFamily: Typography.fonts.sansSemiBold,
    fontSize: Typography.sizes.base,
    color: theme.action.primaryText,
  },
  error: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: Colors.error,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.sm,
    color: theme.text.secondary,
  },
  link: {
    fontFamily: Typography.fonts.sansSemiBold,
    fontSize: Typography.sizes.sm,
    color: theme.action.primary,
  },
});
