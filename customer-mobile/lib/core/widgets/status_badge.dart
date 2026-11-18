import 'package:flutter/material.dart';

import '../../app/theme/app_colors.dart';

class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.label, this.tone = StatusTone.neutral});

  final String label;
  final StatusTone tone;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (tone) {
      StatusTone.success => (AppColors.success.withValues(alpha: 0.12), AppColors.success),
      StatusTone.warning => (AppColors.warning.withValues(alpha: 0.15), AppColors.warning),
      StatusTone.error => (AppColors.error.withValues(alpha: 0.12), AppColors.error),
      StatusTone.info => (AppColors.teal.withValues(alpha: 0.15), AppColors.teal),
      StatusTone.neutral => (AppColors.textSecondary.withValues(alpha: 0.15), AppColors.textSecondary),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(
        label,
        style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w600),
      ),
    );
  }
}

enum StatusTone { success, warning, error, info, neutral }

StatusTone motionTone(String? status) {
  switch (status?.toLowerCase()) {
    case 'moving':
    case 'speeding':
      return StatusTone.info;
    case 'stopped':
      return StatusTone.warning;
    case 'offline':
      return StatusTone.error;
    default:
      return StatusTone.neutral;
  }
}