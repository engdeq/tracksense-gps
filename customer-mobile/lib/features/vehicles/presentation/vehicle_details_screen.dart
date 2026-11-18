import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router/app_routes.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart' show StatusBadge, motionTone;
import '../../data/feature_providers.dart';

class VehicleDetailsScreen extends ConsumerWidget {
  const VehicleDetailsScreen({super.key, required this.vehicleId});

  final String vehicleId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vehicle = ref.watch(vehicleProvider(vehicleId));

    return Scaffold(
      appBar: AppBar(title: const Text('Vehicle details')),
      body: vehicle.when(
        loading: () => const ListSkeleton(count: 2),
        error: (e, _) => ErrorState(message: e.toString(), onRetry: () => ref.invalidate(vehicleProvider(vehicleId))),
        data: (v) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(child: Text(v.name, style: Theme.of(context).textTheme.titleLarge)),
                      StatusBadge(label: v.motionStatus ?? 'unknown', tone: motionTone(v.motionStatus)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(v.plateNumber),
                  if (v.brand != null || v.model != null)
                    Text('${v.brand ?? ''} ${v.model ?? ''}'.trim()),
                ],
              ),
            ),
            const SizedBox(height: 12),
            AppCard(
              child: Column(
                children: [
                  _Row('Status', v.status ?? '—'),
                  _Row('Speed limit', '${v.speedLimitKmh?.toStringAsFixed(0) ?? '—'} km/h'),
                  _Row('Color', v.color ?? '—'),
                ],
              ),
            ),
            const SizedBox(height: 16),
            FilledButton.tonal(
              onPressed: () => context.push(AppRoutes.devices),
              child: const Text('View devices'),
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
          Text(value, style: Theme.of(context).textTheme.titleSmall),
        ],
      ),
    );
  }
}