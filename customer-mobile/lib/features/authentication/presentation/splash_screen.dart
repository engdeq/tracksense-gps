import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router/app_routes.dart';
import '../../../app/theme/app_colors.dart';
import '../../../core/providers/bootstrap_provider.dart';
import '../data/auth_controller.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _navigate());
  }

  Future<void> _navigate() async {
    await Future<void>.delayed(const Duration(milliseconds: 900));
    if (!mounted) return;
    for (var i = 0; i < 30; i++) {
      final auth = ref.read(authControllerProvider);
      if (auth.status != AuthStatus.unknown) break;
      await Future<void>.delayed(const Duration(milliseconds: 100));
    }
    if (!mounted) return;
    final auth = ref.read(authControllerProvider);
    final prefs = ref.read(prefsServiceProvider);
    if (auth.status == AuthStatus.authenticated) {
      context.go(prefs.onboardingComplete ? AppRoutes.home : AppRoutes.onboarding);
    } else {
      context.go(AppRoutes.login);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [AppColors.deepPurple, AppColors.royalPurple],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(Icons.radar, color: Colors.white, size: 48),
              ),
              const SizedBox(height: 20),
              Text(
                'TrackSense',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                    ),
              ),
              const SizedBox(height: 8),
              Text('Fleet intelligence for customers', style: TextStyle(color: Colors.white.withValues(alpha: 0.8))),
              const SizedBox(height: 32),
              const CircularProgressIndicator(color: AppColors.teal),
            ],
          ),
        ),
      ),
    );
  }
}