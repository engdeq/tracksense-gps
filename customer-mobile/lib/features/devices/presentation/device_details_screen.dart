import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart';
import '../../data/feature_providers.dart';

class DeviceDetailsScreen extends ConsumerWidget {
  const DeviceDetailsScreen({super.key, required this.deviceId});

  final String deviceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final device = ref.watch(deviceProvider(deviceId));

    return Scaffold(
      appBar: AppBar(title: const Text('Device details')),
      body: device.when(
        loading: () => const ListSkeleton(count: 2),
        error: (e, _) => ErrorState(message: e.toString(), onRetry: () => ref.invalidate(deviceProvider(deviceId))),
        data: (d) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(child: Text(d.name, style: Theme.of(context).textTheme.titleLarge)),
                      StatusBadge(
                        label: d.connectionStatus ?? 'unknown',
                        tone: d.connectionStatus == 'online' ? StatusTone.success : StatusTone.error,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text('IMEI: ${d.imei}'),
                ],
              ),
            ),
            const SizedBox(height: 12),
            AppCard(
              child: Column(
                children: [
                  _Row('Status', d.status ?? '—'),
                  _Row('SIM', d.simNumber ?? '—'),
                  _Row(
                    'Last communication',
                    d.lastCommunicationAt != null
                        ? DateFormat.yMMMd().add_jm().format(d.lastCommunicationAt!)
                        : '—',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(child: Text(label, style: Theme.of(context).textTheme.bodyMedium)),
          Text(value),
        ],
      ),
    );
  }
}