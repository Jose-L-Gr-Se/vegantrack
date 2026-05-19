import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/utils/nutrition_utils.dart';
import '../../auth/presentation/providers/auth_provider.dart';

class OnboardingPage extends ConsumerStatefulWidget {
  const OnboardingPage({super.key});

  @override
  ConsumerState<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends ConsumerState<OnboardingPage> {
  final _pageCtrl = PageController();
  int _page = 0;

  // Form state
  final _nameCtrl = TextEditingController();
  double _height = 170;
  double _weight = 65;
  DateTime? _birthDate;
  String _sex = 'male';
  String _activity = 'moderate';
  String _goal = 'maintain';

  @override
  void dispose() {
    _pageCtrl.dispose();
    _nameCtrl.dispose();
    super.dispose();
  }

  void _next() {
    if (_page < 3) {
      _pageCtrl.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      setState(() => _page++);
    } else {
      _finish();
    }
  }

  Future<void> _finish() async {
    final targets = calculateTargets(
      weightKg: _weight,
      heightCm: _height,
      birthDate: _birthDate,
      sex: _sex,
      activityLevel: _activity,
      goal: _goal,
    );

    final updates = <String, dynamic>{
      'display_name': _nameCtrl.text.trim().isEmpty ? null : _nameCtrl.text.trim(),
      'height_cm': _height,
      'weight_kg': _weight,
      'birth_date': _birthDate?.toIso8601String().split('T').first,
      'sex': _sex,
      'activity_level': _activity,
      'goal': _goal,
      if (targets != null) ...{
        'calorie_target': targets.calories,
        'protein_target_g': targets.proteinG,
        'carbs_target_g': targets.carbsG,
        'fat_target_g': targets.fatG,
      },
    };

    await ref.read(authStateProvider.notifier).updateProfile(updates);
    // Router will redirect to /diary once profile.calorieTarget is set
  }

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;

    return Scaffold(
      backgroundColor: colors.surface,
      body: SafeArea(
        child: Column(
          children: [
            // Progress indicator
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
              child: Row(
                children: List.generate(4, (i) {
                  return Expanded(
                    child: Container(
                      height: 4,
                      margin: EdgeInsets.only(right: i < 3 ? 4 : 0),
                      decoration: BoxDecoration(
                        color: i <= _page
                            ? const Color(0xFF22C55E)
                            : colors.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }),
              ),
            ),

            Expanded(
              child: PageView(
                controller: _pageCtrl,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _NamePage(controller: _nameCtrl),
                  _BodyPage(
                    height: _height,
                    weight: _weight,
                    sex: _sex,
                    onHeightChanged: (v) => setState(() => _height = v),
                    onWeightChanged: (v) => setState(() => _weight = v),
                    onSexChanged: (v) => setState(() => _sex = v),
                    onBirthDateChanged: (v) => setState(() => _birthDate = v),
                    birthDate: _birthDate,
                  ),
                  _ActivityPage(
                    activity: _activity,
                    onChanged: (v) => setState(() => _activity = v),
                  ),
                  _GoalPage(
                    goal: _goal,
                    onChanged: (v) => setState(() => _goal = v),
                  ),
                ],
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(24),
              child: FilledButton(
                onPressed: _next,
                child: Text(_page < 3 ? 'Siguiente' : 'Empezar'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Onboarding sub-pages ─────────────────────────────────────────────────────

class _NamePage extends StatelessWidget {
  const _NamePage({required this.controller});
  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 32),
          const Text('👋', style: TextStyle(fontSize: 48)),
          const SizedBox(height: 16),
          Text('¿Cómo te llamamos?', style: text.displaySmall),
          const SizedBox(height: 8),
          Text(
            'Tu nombre aparecerá en tu perfil',
            style: text.bodyMedium?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 32),
          TextFormField(
            controller: controller,
            textCapitalization: TextCapitalization.words,
            decoration: const InputDecoration(
              labelText: 'Nombre (opcional)',
              prefixIcon: Icon(Icons.person_outline),
            ),
          ),
        ],
      ),
    );
  }
}

class _BodyPage extends StatelessWidget {
  const _BodyPage({
    required this.height,
    required this.weight,
    required this.sex,
    required this.birthDate,
    required this.onHeightChanged,
    required this.onWeightChanged,
    required this.onSexChanged,
    required this.onBirthDateChanged,
  });

  final double height;
  final double weight;
  final String sex;
  final DateTime? birthDate;
  final ValueChanged<double> onHeightChanged;
  final ValueChanged<double> onWeightChanged;
  final ValueChanged<String> onSexChanged;
  final ValueChanged<DateTime> onBirthDateChanged;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final colors = Theme.of(context).colorScheme;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 32),
          const Text('📏', style: TextStyle(fontSize: 48)),
          const SizedBox(height: 16),
          Text('Tu cuerpo', style: text.displaySmall),
          const SizedBox(height: 8),
          Text(
            'Para calcular tus objetivos nutricionales',
            style: text.bodyMedium?.copyWith(color: colors.onSurfaceVariant),
          ),
          const SizedBox(height: 32),

          // Sex
          Text('Sexo biológico', style: text.titleMedium),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: _SelectChip(
                  label: 'Hombre',
                  selected: sex == 'male',
                  onTap: () => onSexChanged('male'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _SelectChip(
                  label: 'Mujer',
                  selected: sex == 'female',
                  onTap: () => onSexChanged('female'),
                ),
              ),
            ],
          ),

          const SizedBox(height: 24),
          Text('Altura: ${height.round()} cm', style: text.titleMedium),
          Slider(
            value: height,
            min: 140,
            max: 220,
            divisions: 80,
            onChanged: onHeightChanged,
          ),

          const SizedBox(height: 16),
          Text('Peso: ${weight.round()} kg', style: text.titleMedium),
          Slider(
            value: weight,
            min: 30,
            max: 180,
            divisions: 150,
            onChanged: onWeightChanged,
          ),
        ],
      ),
    );
  }
}

class _ActivityPage extends StatelessWidget {
  const _ActivityPage({required this.activity, required this.onChanged});

  final String activity;
  final ValueChanged<String> onChanged;

  static const _options = [
    ('sedentary', '🪑', 'Sedentario', 'Trabajo de escritorio, poco ejercicio'),
    ('light', '🚶', 'Ligero', 'Ejercicio 1-3 días/semana'),
    ('moderate', '🏃', 'Moderado', 'Ejercicio 3-5 días/semana'),
    ('active', '💪', 'Activo', 'Ejercicio intenso 6-7 días/semana'),
    ('very_active', '🔥', 'Muy activo', 'Atleta o trabajo físico intenso'),
  ];

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 32),
          const Text('🏋️', style: TextStyle(fontSize: 48)),
          const SizedBox(height: 16),
          Text('Nivel de actividad', style: text.displaySmall),
          const SizedBox(height: 32),
          ..._options.map((o) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _ActivityCard(
                  emoji: o.$2,
                  label: o.$3,
                  description: o.$4,
                  selected: activity == o.$1,
                  onTap: () => onChanged(o.$1),
                ),
              )),
        ],
      ),
    );
  }
}

class _GoalPage extends StatelessWidget {
  const _GoalPage({required this.goal, required this.onChanged});

  final String goal;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 32),
          const Text('🎯', style: TextStyle(fontSize: 48)),
          const SizedBox(height: 16),
          Text('¿Cuál es tu objetivo?', style: text.displaySmall),
          const SizedBox(height: 32),
          _ActivityCard(
            emoji: '📉',
            label: 'Perder peso',
            description: 'Déficit calórico de 500 kcal/día',
            selected: goal == 'cut',
            onTap: () => onChanged('cut'),
          ),
          const SizedBox(height: 8),
          _ActivityCard(
            emoji: '⚖️',
            label: 'Mantener peso',
            description: 'Calorías de mantenimiento (TDEE)',
            selected: goal == 'maintain',
            onTap: () => onChanged('maintain'),
          ),
          const SizedBox(height: 8),
          _ActivityCard(
            emoji: '📈',
            label: 'Ganar masa',
            description: 'Superávit calórico de 300 kcal/día',
            selected: goal == 'bulk',
            onTap: () => onChanged('bulk'),
          ),
        ],
      ),
    );
  }
}

// ─── Helper widgets ───────────────────────────────────────────────────────────

class _SelectChip extends StatelessWidget {
  const _SelectChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0xFF22C55E)
              : colors.surfaceContainerLow,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected
                ? const Color(0xFF22C55E)
                : colors.outlineVariant,
          ),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: selected ? Colors.white : colors.onSurface,
          ),
        ),
      ),
    );
  }
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({
    required this.emoji,
    required this.label,
    required this.description,
    required this.selected,
    required this.onTap,
  });

  final String emoji;
  final String label;
  final String description;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final colors = Theme.of(context).colorScheme;
    final text = Theme.of(context).textTheme;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0xFFDCFCE7)
              : colors.surfaceContainerLowest,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: selected
                ? const Color(0xFF22C55E)
                : colors.outlineVariant,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Text(emoji, style: const TextStyle(fontSize: 28)),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: text.titleMedium?.copyWith(
                        color: selected
                            ? const Color(0xFF15803D)
                            : colors.onSurface,
                        fontWeight: FontWeight.w600,
                      )),
                  Text(description,
                      style: text.bodySmall?.copyWith(
                        color: colors.onSurfaceVariant,
                      )),
                ],
              ),
            ),
            if (selected)
              const Icon(Icons.check_circle,
                  color: Color(0xFF22C55E), size: 20),
          ],
        ),
      ),
    );
  }
}
