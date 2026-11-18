import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/state_views.dart';
import '../../data/feature_providers.dart';
import '../../data/repositories.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alerts = ref.watch(alertsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          TextButton(
            onPressed: () async {
              await ref.read(customerApiProvider).markAllAlertsRead();
              ref.invalidate(alertsProvider);
            },
            child: const Text('Mark all read'),
          ),
        ],
      ),
      body: alerts.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorState(message: e.toString(), onRetry: () => ref.invalidate(alertsProvider)),
        data: (data) {
          if (data.items.isEmpty) {
            return const EmptyState(title: 'No notifications', icon: Icons.notifications_none);
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(alertsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: data.items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final alert = data.items[i];
                return AppCard(
                  onTap: () async {
                    if (!alert.isRead) {
                      await ref.read(customerApiProvider).markAlertRead(alert.id);
                      ref.invalidate(alertsProvider);
                    }
                  },
                  child: Row(
                    children: [
                      Icon(
                        alert.isRead ? Icons.notifications_none : Icons.notifications_active,
                        color: alert.isRead ? null : Theme.of(context).colorScheme.primary,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(alert.title, style: Theme.of(context).textTheme.titleSmall),
                            if (alert.message != null) Text(alert.message!),
                            if (alert.createdAt != null)
                              Text(
                                DateFormat.MMMd().add_jm().format(alert.createdAt!),
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}