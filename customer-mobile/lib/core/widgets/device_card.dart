import 'package:flutter/material.dart';

import '../../app/theme/app_colors.dart';
import '../../features/devices/data/device_models.dart';
import 'app_card.dart';
import 'status_badge.dart';

class DeviceCard extends StatelessWidget {
  const DeviceCard({super.key, required this.device, this.onTap});

  final Device device;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final online = device.connectionStatus == 'online';
    return AppCard(
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: AppColors.teal.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.sensors, color: AppColors.teal),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(device.name, style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 4),
                Text(device.imei, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          StatusBadge(
            label: device.connectionStatus ?? 'unknown',
            tone: online ? StatusTone.success : StatusTone.error,
          ),
        ],
      ),
    );
  }
}