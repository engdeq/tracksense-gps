import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/vehicle_card.dart';
import '../../data/feature_providers.dart';

class VehiclesListScreen extends ConsumerStatefulWidget {
  const VehiclesListScreen({super.key});

  @override
  ConsumerState<VehiclesListScreen> createState() => _VehiclesListScreenState();
}

class _VehiclesListScreenState extends ConsumerState<VehiclesListScreen> {
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _search.text;
    final vehicles = ref.watch(vehiclesProvider(query));

    return Scaffold(
      appBar: AppBar(title: const Text('Vehicles')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              controller: _search,
              decoration: const InputDecoration(
                hintText: 'Search vehicles',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          Expanded(
            child: vehicles.when(
              loading: () => const ListSkeleton(),
              error: (e, _) => ErrorState(
                message: e.toString(),
                onRetry: () => ref.invalidate(vehiclesProvider(query)),
              ),
              data: (data) {
                if (data.items.isEmpty) {
                  return const EmptyState(title: 'No vehicles found');
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(vehiclesProvider(query)),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemBuilder: (_, i) => VehicleCard(
                      vehicle: data.items[i],
                      onTap: () => context.push('/vehicles/${data.items[i].id}'),
                    ),
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemCount: data.items.length,
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}