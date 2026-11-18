import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/device_card.dart';
import '../../../core/widgets/state_views.dart';
import '../../data/feature_providers.dart';

class DevicesListScreen extends ConsumerStatefulWidget {
  const DevicesListScreen({super.key});

  @override
  ConsumerState<DevicesListScreen> createState() => _DevicesListScreenState();
}

class _DevicesListScreenState extends ConsumerState<DevicesListScreen> {
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _search.text;
    final devices = ref.watch(devicesProvider(query));

    return Scaffold(
      appBar: AppBar(title: const Text('Devices')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              controller: _search,
              decoration: const InputDecoration(
                hintText: 'Search devices',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          Expanded(
            child: devices.when(
              loading: () => const ListSkeleton(),
              error: (e, _) => ErrorState(
                message: e.toString(),
                onRetry: () => ref.invalidate(devicesProvider(query)),
              ),
              data: (data) {
                if (data.items.isEmpty) {
                  return const EmptyState(title: 'No devices found');
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(devicesProvider(query)),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemBuilder: (_, i) => DeviceCard(
                      device: data.items[i],
                      onTap: () => context.push('/devices/${data.items[i].id}'),
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