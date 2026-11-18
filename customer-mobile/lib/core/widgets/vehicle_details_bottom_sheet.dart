import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../features/live_tracking/data/gps_models.dart';
import 'primary_button.dart';
import 'status_badge.dart' show StatusBadge, motionTone;

class VehicleDetailsBottomSheet extends StatelessWidget {
  const VehicleDetailsBottomSheet({
    super.key,
    required this.item,
    required this.onCenter,
    this.onViewDetails,
  });

  final GpsPositionItem item;
  final VoidCallback onCenter;
  final VoidCallback? onViewDetails;

  @override
  Widget build(BuildContext context) {
    final vehicle = item.vehicle;
    final position = item.position;
    final speed = position?.speedKmh?.toStringAsFixed(0) ?? '—';
    final recorded = position?.recordedAt;

    return Container(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade400,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Text(
                    vehicle?.name ?? 'Vehicle',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                StatusBadge(
                  label: vehicle?.motionStatus ?? 'unknown',
                  tone: motionTone(vehicle?.motionStatus),
                ),
              ],
            ),
            if (vehicle?.plateNumber != null) ...[
              const SizedBox(height: 4),
              Text(vehicle!.plateNumber!, style: Theme.of(context).textTheme.bodyMedium),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                _Metric(label: 'Speed', value: '$speed km/h'),
                _Metric(label: 'Heading', value: position?.heading?.toStringAsFixed(0) ?? '—'),
                _Metric(
                  label: 'Updated',
                  value: recorded != null ? DateFormat.jm().format(recorded) : '—',
                ),
              ],
            ),
            if (position?.address != null && position!.address!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(position.address!, style: Theme.of(context).textTheme.bodySmall),
            ],
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: SecondaryButton(label: 'Center on map', onPressed: onCenter, icon: Icons.my_location),
                ),
                if (onViewDetails != null) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    child: PrimaryButton(label: 'Details', onPressed: onViewDetails),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 4),
          Text(value, style: Theme.of(context).textTheme.titleSmall),
        ],
      ),
    );
  }
}