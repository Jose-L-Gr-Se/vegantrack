import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';

enum _AuthMode { login, register }

class AuthPage extends ConsumerStatefulWidget {
  const AuthPage({super.key});

  @override
  ConsumerState<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends ConsumerState<AuthPage> {
  _AuthMode _mode = _AuthMode.login;
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscure = true;
  bool _loading = false;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _loading = true);

    final notifier = ref.read(authStateProvider.notifier);
    final email = _emailCtrl.text.trim();
    final password = _passwordCtrl.text.trim();

    final error = _mode == _AuthMode.login
        ? await notifier.signIn(email, password)
        : await notifier.signUp(email, password);

    if (!mounted) return;
    setState(() => _loading = false);

    if (error != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(error), backgroundColor: Colors.red),
      );
    }
    // Router redirects automatically on auth state change
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: colors.surface,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Logo / brand
                const _AppLogo(),
                const SizedBox(height: 40),

                Text(
                  _mode == _AuthMode.login ? 'Bienvenido de nuevo' : 'Crea tu cuenta',
                  style: text.displaySmall,
                ),
                const SizedBox(height: 8),
                Text(
                  _mode == _AuthMode.login
                      ? 'Accede a tu diario vegano'
                      : 'Empieza a llevar tu dieta vegana',
                  style: text.bodyMedium?.copyWith(
                    color: colors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 32),

                Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      TextFormField(
                        controller: _emailCtrl,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        autocorrect: false,
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          prefixIcon: Icon(Icons.email_outlined),
                        ),
                        validator: (v) {
                          if (v == null || v.isEmpty) return 'Introduce tu email';
                          if (!v.contains('@')) return 'Email no válido';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _passwordCtrl,
                        obscureText: _obscure,
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _submit(),
                        decoration: InputDecoration(
                          labelText: 'Contraseña',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(_obscure
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined),
                            onPressed: () =>
                                setState(() => _obscure = !_obscure),
                          ),
                        ),
                        validator: (v) {
                          if (v == null || v.isEmpty) {
                            return 'Introduce tu contraseña';
                          }
                          if (_mode == _AuthMode.register && v.length < 6) {
                            return 'Mínimo 6 caracteres';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 24),
                      FilledButton(
                        onPressed: _loading ? null : _submit,
                        child: _loading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : Text(
                                _mode == _AuthMode.login
                                    ? 'Entrar'
                                    : 'Crear cuenta',
                              ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),
                Center(
                  child: TextButton(
                    onPressed: () => setState(() {
                      _mode = _mode == _AuthMode.login
                          ? _AuthMode.register
                          : _AuthMode.login;
                      _formKey.currentState?.reset();
                    }),
                    child: Text(
                      _mode == _AuthMode.login
                          ? '¿Sin cuenta? Regístrate'
                          : '¿Ya tienes cuenta? Entra',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AppLogo extends StatelessWidget {
  const _AppLogo();

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return Row(
      children: [
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: const Color(0xFF22C55E),
            borderRadius: BorderRadius.circular(14),
          ),
          child: const Icon(Icons.eco_rounded, color: Colors.white, size: 28),
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'VeganTrack',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: colors.onSurface,
              ),
            ),
            Text(
              'Consciente',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: const Color(0xFF22C55E),
                letterSpacing: 1.5,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
