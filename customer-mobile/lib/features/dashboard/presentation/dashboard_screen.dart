import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../app/router/app_routes.dart';
import '../../../app/theme/app_colors.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/vehicle_card.dart' show DashboardStatCard, VehicleCard;
import '../../data/feature_providers.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashboard = ref.watch(dashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            onPressed: () => context.push(AppRoutes.notifications),
            icon: const Icon(Icons.notifications_none_rounded),
          ),
        ],
      ),
      body: dashboard.when(
        loading: () => const ListSkeleton(count: 3),
        error: (e, _) => ErrorState(message: e.toString(), onRetry: () => ref.invalidate(dashboardProvider)),
        data: (data) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(dashboardProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Fleet overview', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.2,
                children: [
                  DashboardStatCard(
                    title: 'Vehicles',
                    value: '${data.totalVehicles}',
                    icon: Icons.directions_car,
                  ),
                  DashboardStatCard(
                    title: 'Online',
                    value: '${data.onlineVehicles}',
                    icon: Icons.wifi_tethering,
                    accent: AppColors.teal,
                  ),
                  DashboardStatCard(
                    title: 'Trips today',
                    value: '${data.todaysTrips}',
                    icon: Icons.route,
                  ),
                  DashboardStatCard(
                    title: 'Distance today',
                    value: '${data.distanceTodayKm.toStringAsFixed(1)} km',
                    icon: Icons.straighten,
                    accent: AppColors.teal,
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Text('Recent trips', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              if (data.recentTrips.isEmpty)
                const EmptyState(title: 'No trips today', subtitle: 'Trips will appear here once vehicles move.')
              else
                ...data.recentTrips.map(
                  (trip) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(trip.vehicleName ?? 'Trip'),
                    subtitle: Text(DateFormat.MMMd().add_jm().format(trip.startTime)),
                    trailing: Text('${trip.distanceKm?.toStringAsFixed(1) ?? '0'} km'),
                    onTap: () => context.push('/trips/${trip.id}'),
                  ),
                ),
              const SizedBox(height: 12),
              Text('Fleet snapshot', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              ...data.vehicles.take(5).map(
                    (v) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: VehicleCard(
                        vehicle: v,
                        onTap: () => context.push('/vehicles/${v.id}'),
                      ),
                    ),
                  ),
            ],
          ),
        ),
      ),
    );
  }
}