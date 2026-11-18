import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router/app_routes.dart';
import '../../../app/theme/app_colors.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/primary_button.dart';
import '../../authentication/data/auth_controller.dart';

class ProfileTabScreen extends ConsumerWidget {
  const ProfileTabScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).user;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          AppCard(
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.royalPurple.withValues(alpha: 0.15),
                  child: Text(
                    (user?.fullName ?? user?.username ?? '?').substring(0, 1).toUpperCase(),
                    style: const TextStyle(color: AppColors.royalPurple, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user?.fullName ?? user?.username ?? 'Customer', style: Theme.of(context).textTheme.titleMedium),
                      Text(user?.email ?? ''),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _MenuTile(Icons.person_outline, 'Edit profile', () => context.push(AppRoutes.editProfile)),
          _MenuTile(Icons.lock_outline, 'Change password', () => context.push(AppRoutes.changePassword)),
          _MenuTile(Icons.devices, 'Devices', () => context.push(AppRoutes.devices)),
          _MenuTile(Icons.assessment_outlined, 'Reports', () => context.push(AppRoutes.reports)),
          _MenuTile(Icons.notifications_outlined, 'Notifications', () => context.push(AppRoutes.notifications)),
          _MenuTile(Icons.settings_outlined, 'Settings', () => context.push(AppRoutes.settings)),
          const SizedBox(height: 24),
          SecondaryButton(
            label: 'Sign out',
            icon: Icons.logout,
            onPressed: () async {
              await ref.read(authControllerProvider.notifier).logout();
              if (context.mounted) context.go(AppRoutes.login);
            },
          ),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile(this.icon, this.title, this.onTap);

  final IconData icon;
  final String title;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: AppColors.royalPurple),
        title: Text(title),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}