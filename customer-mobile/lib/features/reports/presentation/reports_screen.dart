import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/state_views.dart';
import '../../data/feature_providers.dart';

class ReportsScreen extends ConsumerWidget {
  const ReportsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final report = ref.watch(distanceReportProvider);

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Reports'),
          bottom: const TabBar(tabs: [Tab(text: 'Distance'), Tab(text: 'Trips')]),
        ),
        body: TabBarView(
          children: [
            report.when(
              loading: () => const ListSkeleton(),
              error: (e, _) => ErrorState(
                message: e.toString(),
                onRetry: () => ref.invalidate(distanceReportProvider),
              ),
              data: (data) => RefreshIndicator(
                onRefresh: () async => ref.invalidate(distanceReportProvider),
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: data.items.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final row = data.items[i];
                    return AppCard(
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(row.vehicleName ?? 'Vehicle', style: Theme.of(context).textTheme.titleSmall),
                                Text(row.plate ?? ''),
                              ],
                            ),
                          ),
                          Text('${row.totalDistanceKm?.toStringAsFixed(1) ?? '0'} km'),
                        ],
                      ),
                    );
                  },
                ),
              ),
            ),
            const Center(child: Text('Trip and speed reports use the same date filters via API.')),
          ],
        ),
      ),
    );
  }
}