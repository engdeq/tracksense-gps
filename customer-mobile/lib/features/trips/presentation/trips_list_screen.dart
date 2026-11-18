import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/state_views.dart';
import '../../data/feature_providers.dart';

class TripsListScreen extends ConsumerWidget {
  const TripsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trips = ref.watch(tripsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Trips')),
      body: trips.when(
        loading: () => const ListSkeleton(),
        error: (e, _) => ErrorState(message: e.toString(), onRetry: () => ref.invalidate(tripsProvider)),
        data: (data) {
          if (data.items.isEmpty) {
            return const EmptyState(title: 'No trips yet', subtitle: 'Completed trips will show up here.');
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(tripsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: data.items.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) {
                final trip = data.items[i];
                return AppCard(
                  onTap: () => context.push('/trips/${trip.id}'),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(trip.vehicleName ?? 'Trip', style: Theme.of(context).textTheme.titleSmall),
                            const SizedBox(height: 4),
                            Text(DateFormat.MMMd().add_jm().format(trip.startTime)),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('${trip.distanceKm?.toStringAsFixed(1) ?? '0'} km'),
                          Text('${trip.avgSpeedKmh?.toStringAsFixed(0) ?? '—'} km/h avg'),
                        ],
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