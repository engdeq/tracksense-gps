import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../app/config/maps_config.dart';
import '../../../app/theme/app_colors.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/status_badge.dart' show StatusBadge, motionTone;
import '../../../core/widgets/vehicle_details_bottom_sheet.dart';
import '../../data/feature_providers.dart';
import '../data/gps_models.dart';

class LiveMapScreen extends ConsumerStatefulWidget {
  const LiveMapScreen({super.key});

  @override
  ConsumerState<LiveMapScreen> createState() => _LiveMapScreenState();
}

class _LiveMapScreenState extends ConsumerState<LiveMapScreen> {
  GoogleMapController? _controller;
  final _search = TextEditingController();
  MapType _mapType = MapType.normal;
  GpsPositionItem? _selected;

  @override
  void dispose() {
    _search.dispose();
    _controller?.dispose();
    super.dispose();
  }

  Set<Marker> _markers(List<GpsPositionItem> items) {
    return items
        .where((i) => i.position?.latitude != null && i.position?.longitude != null)
        .map((item) {
          final pos = item.position!;
          final id = item.vehicle?.id ?? '${pos.latitude},${pos.longitude}';
          return Marker(
            markerId: MarkerId(id),
            position: LatLng(pos.latitude!, pos.longitude!),
            rotation: pos.heading ?? 0,
            flat: true,
            infoWindow: InfoWindow(
              title: item.vehicle?.plateNumber ?? item.vehicle?.name ?? 'Vehicle',
              snippet: '${pos.speedKmh?.toStringAsFixed(0) ?? '0'} km/h',
            ),
            onTap: () => setState(() => _selected = item),
          );
        })
        .toSet();
  }

  Future<void> _centerOn(GpsPositionItem item) async {
    final lat = item.position?.latitude;
    final lng = item.position?.longitude;
    if (lat == null || lng == null || _controller == null) return;
    await _controller!.animateCamera(
      CameraUpdate.newLatLngZoom(LatLng(lat, lng), 14),
    );
  }

  @override
  Widget build(BuildContext context) {
    final query = _search.text;
    final async = ref.watch(gpsPositionsProvider(query));

    return Scaffold(
      body: async.when(
        loading: () => const LoadingState(message: 'Loading live map…'),
        error: (e, _) => ErrorState(
          message: e.toString(),
          onRetry: () => ref.invalidate(gpsPositionsProvider(query)),
        ),
        data: (items) {
          final withPos = items
              .where((i) => i.position?.latitude != null && i.position?.longitude != null)
              .toList();
          final initial = withPos.isNotEmpty
              ? LatLng(withPos.first.position!.latitude!, withPos.first.position!.longitude!)
              : const LatLng(24.7136, 46.6753);

          return Stack(
            children: [
              if (MapsConfig.hasApiKey)
                GoogleMap(
                  initialCameraPosition: CameraPosition(target: initial, zoom: 11),
                  markers: _markers(items),
                  mapType: _mapType,
                  myLocationButtonEnabled: false,
                  zoomControlsEnabled: false,
                  onMapCreated: (c) => _controller = c,
                  onTap: (_) => setState(() => _selected = null),
                )
              else
                Container(
                  color: AppColors.lightBg,
                  alignment: Alignment.center,
                  child: const Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'Map preview unavailable. Add a Google Maps API key to enable the interactive map. Vehicle list below still shows live positions from the API.',
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    children: [
                      Material(
                        elevation: 4,
                        borderRadius: BorderRadius.circular(16),
                        child: TextField(
                          controller: _search,
                          decoration: InputDecoration(
                            hintText: 'Search vehicles',
                            prefixIcon: const Icon(Icons.search),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.layers_outlined),
                              onPressed: () {
                                setState(() {
                                  _mapType =
                                      _mapType == MapType.normal ? MapType.hybrid : MapType.normal;
                                });
                              },
                            ),
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Positioned(
                right: 12,
                bottom: _selected == null ? 24 : 220,
                child: Column(
                  children: [
                    FloatingActionButton.small(
                      heroTag: 'zoom_in',
                      onPressed: () => _controller?.animateCamera(CameraUpdate.zoomIn()),
                      child: const Icon(Icons.add),
                    ),
                    const SizedBox(height: 8),
                    FloatingActionButton.small(
                      heroTag: 'zoom_out',
                      onPressed: () => _controller?.animateCamera(CameraUpdate.zoomOut()),
                      child: const Icon(Icons.remove),
                    ),
                    const SizedBox(height: 8),
                    FloatingActionButton.small(
                      heroTag: 'refresh',
                      onPressed: () => ref.invalidate(gpsPositionsProvider(query)),
                      child: const Icon(Icons.refresh),
                    ),
                  ],
                ),
              ),
              if (_selected != null)
                Align(
                  alignment: Alignment.bottomCenter,
                  child: VehicleDetailsBottomSheet(
                    item: _selected!,
                    onCenter: () => _centerOn(_selected!),
                    onViewDetails: _selected!.vehicle?.id != null
                        ? () {
                            final id = _selected!.vehicle!.id;
                            setState(() => _selected = null);
                            context.push('/vehicles/$id');
                          }
                        : null,
                  ),
                )
              else
                Align(
                  alignment: Alignment.bottomCenter,
                  child: SizedBox(
                    height: 120,
                    child: ListView.separated(
                      padding: const EdgeInsets.fromLTRB(12, 0, 12, 16),
                      scrollDirection: Axis.horizontal,
                      itemCount: items.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (_, i) {
                        final item = items[i];
                        final v = item.vehicle;
                        return GestureDetector(
                          onTap: () {
                            setState(() => _selected = item);
                            _centerOn(item);
                          },
                          child: Container(
                            width: 220,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Theme.of(context).cardColor,
                              borderRadius: BorderRadius.circular(16),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.12),
                                  blurRadius: 12,
                                ),
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  v?.plateNumber ?? v?.name ?? 'Vehicle',
                                  style: const TextStyle(fontWeight: FontWeight.w700),
                                ),
                                const SizedBox(height: 4),
                                StatusBadge(
                                  label: v?.motionStatus ?? 'offline',
                                  tone: motionTone(v?.motionStatus),
                                ),
                                const Spacer(),
                                Text(
                                  '${item.position?.speedKmh?.toStringAsFixed(0) ?? '—'} km/h',
                                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}