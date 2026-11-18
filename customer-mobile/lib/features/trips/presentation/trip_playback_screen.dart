import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../app/config/maps_config.dart';
import '../../../app/theme/app_colors.dart';
import '../../../core/widgets/state_views.dart';
import '../../data/feature_providers.dart';
import '../../live_tracking/data/gps_models.dart';

class TripPlaybackScreen extends ConsumerStatefulWidget {
  const TripPlaybackScreen({super.key, required this.tripId});

  final String tripId;

  @override
  ConsumerState<TripPlaybackScreen> createState() => _TripPlaybackScreenState();
}

class _TripPlaybackScreenState extends ConsumerState<TripPlaybackScreen> {
  GoogleMapController? _mapController;
  Timer? _timer;
  var _playing = false;
  var _index = 0;
  var _speedMultiplier = 1.0;
  Set<Marker> _markers = {};
  Set<Polyline> _polylines = {};

  @override
  void dispose() {
    _stop();
    _mapController?.dispose();
    super.dispose();
  }

  void _stop() {
    _timer?.cancel();
    _playing = false;
    _index = 0;
  }

  void _prepareMap(List<GpsPosition> points) {
    if (points.isEmpty) return;
    final latLngs = points
        .where((p) => p.latitude != null && p.longitude != null)
        .map((p) => LatLng(p.latitude!, p.longitude!))
        .toList();
  if (latLngs.isEmpty) return;

    _polylines = {
      Polyline(
        polylineId: const PolylineId('route'),
        color: AppColors.royalPurple,
        width: 4,
        points: latLngs,
      ),
    };
    _updateMarker(points.first);
  }

  void _updateMarker(GpsPosition point) {
    if (point.latitude == null || point.longitude == null) return;
    _markers = {
      Marker(
        markerId: const MarkerId('playback'),
        position: LatLng(point.latitude!, point.longitude!),
        rotation: point.heading ?? 0,
        flat: true,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueViolet),
      ),
    };
    _mapController?.animateCamera(CameraUpdate.newLatLng(LatLng(point.latitude!, point.longitude!)));
    setState(() {});
  }

  void _play(List<GpsPosition> points) {
    if (points.isEmpty) return;
    _playing = true;
    _timer?.cancel();
    _timer = Timer.periodic(Duration(milliseconds: (500 / _speedMultiplier).round()), (_) {
      if (_index >= points.length - 1) {
        _stop();
        return;
      }
      setState(() => _index++);
      _updateMarker(points[_index]);
    });
  }

  @override
  Widget build(BuildContext context) {
    final playback = ref.watch(tripPlaybackProvider(widget.tripId));

    return Scaffold(
      appBar: AppBar(title: const Text('Trip playback')),
      body: playback.when(
        loading: () => const LoadingState(message: 'Loading route...'),
        error: (e, _) => ErrorState(
          message: e.toString(),
          onRetry: () => ref.invalidate(tripPlaybackProvider(widget.tripId)),
        ),
        data: (data) {
          final points = data.points.where((p) => p.latitude != null && p.longitude != null).toList();
          if (_polylines.isEmpty && points.isNotEmpty) {
            WidgetsBinding.instance.addPostFrameCallback((_) => _prepareMap(points));
          }

          return Column(
            children: [
              Expanded(
                child: MapsConfig.hasApiKey
                    ? GoogleMap(
                        initialCameraPosition: CameraPosition(
                          target: LatLng(points.first.latitude!, points.first.longitude!),
                          zoom: 14,
                        ),
                        markers: _markers,
                        polylines: _polylines,
                        onMapCreated: (c) => _mapController = c,
                        myLocationButtonEnabled: false,
                      )
                    : const EmptyState(
                        title: 'Google Maps key required',
                        subtitle:
                            'Add GOOGLE_MAPS_API_KEY to android/local.properties and Info.plist to enable playback map.',
                        icon: Icons.map_outlined,
                      ),
              ),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Text('Speed ${_speedMultiplier.toStringAsFixed(1)}x'),
                          Expanded(
                            child: Slider(
                              value: _speedMultiplier,
                              min: 0.5,
                              max: 3,
                              divisions: 5,
                              onChanged: (v) => setState(() => _speedMultiplier = v),
                            ),
                          ),
                        ],
                      ),
                      Slider(
                        value: points.isEmpty ? 0 : _index.toDouble(),
                        max: points.isEmpty ? 1 : (points.length - 1).toDouble(),
                        onChanged: (v) {
                          final i = v.round();
                          setState(() => _index = i);
                          if (points.isNotEmpty) _updateMarker(points[i]);
                        },
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          IconButton(
                            onPressed: points.isEmpty
                                ? null
                                : () {
                                    if (_playing) {
                                      _timer?.cancel();
                                      setState(() => _playing = false);
                                    } else {
                                      _play(points);
                                    }
                                  },
                            icon: Icon(_playing ? Icons.pause_circle_filled : Icons.play_circle_fill),
                            iconSize: 48,
                            color: AppColors.royalPurple,
                          ),
                          IconButton(
                            onPressed: points.isEmpty
                                ? null
                                : () {
                                    _stop();
                                    setState(() {});
                                    _updateMarker(points.first);
                                  },
                            icon: const Icon(Icons.stop_circle_outlined),
                            iconSize: 40,
                          ),
                        ],
                      ),
                    ],
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