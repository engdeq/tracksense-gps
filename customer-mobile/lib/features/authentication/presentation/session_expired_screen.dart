import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router/app_routes.dart';
import '../../../core/api/dio_client.dart';
import '../../../core/widgets/primary_button.dart';
import '../data/auth_controller.dart';

class SessionExpiredScreen extends ConsumerWidget {
  const SessionExpiredScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.lock_clock_outlined, size: 64),
              const SizedBox(height: 16),
              Text('Session expired', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              const Text('Please sign in again to continue.'),
              const SizedBox(height: 24),
              PrimaryButton(
                label: 'Back to login',
                onPressed: () async {
                  ref.read(sessionExpiredProvider.notifier).clear();
                  await ref.read(authControllerProvider.notifier).logout();
                  if (context.mounted) context.go(AppRoutes.login);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}