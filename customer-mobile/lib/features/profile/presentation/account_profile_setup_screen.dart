import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router/app_routes.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/primary_button.dart';
import '../../authentication/data/auth_controller.dart';
import '../../data/repositories.dart';

class AccountProfileSetupScreen extends ConsumerStatefulWidget {
  const AccountProfileSetupScreen({super.key});

  @override
  ConsumerState<AccountProfileSetupScreen> createState() => _AccountProfileSetupScreenState();
}

class _AccountProfileSetupScreenState extends ConsumerState<AccountProfileSetupScreen> {
  final _fullName = TextEditingController();
  final _phone = TextEditingController();
  var _loading = false;

  @override
  void dispose() {
    _fullName.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _continue() async {
    setState(() => _loading = true);
    try {
      if (_fullName.text.trim().isNotEmpty || _phone.text.trim().isNotEmpty) {
        await ref.read(profileRepositoryProvider).updateProfile(
              fullName: _fullName.text.trim().isEmpty ? null : _fullName.text.trim(),
              phone: _phone.text.trim().isEmpty ? null : _phone.text.trim(),
            );
        await ref.read(authControllerProvider.notifier).refreshUser();
      }
      if (mounted) context.go(AppRoutes.home);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Complete your profile')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Almost ready', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              const Text('Add optional contact details for your fleet account.'),
              const SizedBox(height: 24),
              AppTextField(controller: _fullName, label: 'Full name'),
              const SizedBox(height: 16),
              AppTextField(controller: _phone, label: 'Phone', keyboardType: TextInputType.phone),
              const Spacer(),
              PrimaryButton(label: 'Continue to dashboard', onPressed: _continue, isLoading: _loading),
            ],
          ),
        ),
      ),
    );
  }
}