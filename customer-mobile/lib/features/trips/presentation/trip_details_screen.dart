import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/state_views.dart';
import '../../data/feature_providers.dart';

class TripDetailsScreen extends ConsumerWidget {
  const TripDetailsScreen({super.key, required this.tripId});

  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trip = ref.watch(tripProvider(tripId));

    return Scaffold(
      appBar: AppBar(title: const Text('Trip details')),
      body: trip.when(
        loading: () => const ListSkeleton(count: 2),
        error: (e, _) => ErrorState(message: e.toString(), onRetry: () => ref.invalidate(tripProvider(tripId))),
        data: (data) {
          final t = data.trip;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(t.vehicleName ?? 'Trip', style: Theme.of(context).textTheme.titleLarge),
                    const SizedBox(height: 8),
                    Text('Started ${DateFormat.MMMd().add_jm().format(t.startTime)}'),
                    if (t.endTime != null) Text('Ended ${DateFormat.MMMd().add_jm().format(t.endTime!)}'),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              AppCard(
                child: Column(
                  children: [
                    _Row('Distance', '${t.distanceKm?.toStringAsFixed(2) ?? '0'} km'),
                    _Row('Avg speed', '${t.avgSpeedKmh?.toStringAsFixed(0) ?? '—'} km/h'),
                    _Row('Max speed', '${t.maxSpeedKmh?.toStringAsFixed(0) ?? '—'} km/h'),
                    _Row('Route points', '${data.route.length}'),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              PrimaryButton(
                label: 'Open playback',
                icon: Icons.play_arrow_rounded,
                onPressed: () => context.push('/trips/$tripId/playback'),
              ),
            ],
          );
        },
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
          Expanded(child: Text(label)),
          Text(value, style: Theme.of(context).textTheme.titleSmall),
        ],
      ),
    );
  }
}