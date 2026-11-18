import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/dio_client.dart';
import '../../core/providers/bootstrap_provider.dart';
import '../../features/authentication/data/auth_controller.dart';
import '../../features/authentication/presentation/forgot_password_screen.dart';
import '../../features/authentication/presentation/login_screen.dart';
import '../../features/authentication/presentation/reset_password_screen.dart';
import '../../features/authentication/presentation/session_expired_screen.dart';
import '../../features/authentication/presentation/splash_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/devices/presentation/device_details_screen.dart';
import '../../features/devices/presentation/devices_list_screen.dart';
import '../../features/live_tracking/presentation/live_map_screen.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/onboarding/presentation/onboarding_screen.dart';
import '../../features/profile/presentation/account_profile_setup_screen.dart';
import '../../features/profile/presentation/change_password_screen.dart';
import '../../features/profile/presentation/edit_profile_screen.dart';
import '../../features/profile/presentation/profile_tab_screen.dart';
import '../../features/profile/presentation/settings_screen.dart';
import '../../features/reports/presentation/reports_screen.dart';
import '../../features/shell/presentation/main_shell_screen.dart';
import '../../features/trips/presentation/trip_details_screen.dart';
import '../../features/trips/presentation/trip_playback_screen.dart';
import '../../features/trips/presentation/trips_list_screen.dart';
import '../../features/vehicles/presentation/vehicle_details_screen.dart';
import '../../features/vehicles/presentation/vehicles_list_screen.dart';
import 'app_routes.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'root');
final _shellNavigatorHome = GlobalKey<NavigatorState>(debugLabel: 'shellHome');
final _shellNavigatorVehicles = GlobalKey<NavigatorState>(debugLabel: 'shellVehicles');
final _shellNavigatorMap = GlobalKey<NavigatorState>(debugLabel: 'shellMap');
final _shellNavigatorTrips = GlobalKey<NavigatorState>(debugLabel: 'shellTrips');
final _shellNavigatorProfile = GlobalKey<NavigatorState>(debugLabel: 'shellProfile');

final goRouterProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authControllerProvider);
  final prefs = ref.watch(prefsServiceProvider);

  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: AppRoutes.splash,
    refreshListenable: _RouterRefresh(ref),
    redirect: (context, state) {
      final path = state.matchedLocation;
      final loggedIn = auth.status == AuthStatus.authenticated;
      final booting = auth.status == AuthStatus.unknown;
      final isPublic = _publicPaths.contains(path);

      if (ref.read(sessionExpiredProvider) && path != AppRoutes.sessionExpired) {
        return AppRoutes.sessionExpired;
      }

      if (path == AppRoutes.splash) return null;

      if (booting) return AppRoutes.splash;

      if (!loggedIn && !isPublic) return AppRoutes.login;

      if (loggedIn && (path == AppRoutes.login || path == AppRoutes.onboarding)) {
        if (!prefs.onboardingComplete) return AppRoutes.onboarding;
        return AppRoutes.home;
      }

      if (loggedIn && path == AppRoutes.splash) {
        if (!prefs.onboardingComplete) return AppRoutes.onboarding;
        return AppRoutes.home;
      }

      return null;
    },
    routes: [
      GoRoute(path: AppRoutes.splash, builder: (_, __) => const SplashScreen()),
      GoRoute(path: AppRoutes.onboarding, builder: (_, __) => const OnboardingScreen()),
      GoRoute(path: AppRoutes.login, builder: (_, __) => const LoginScreen()),
      GoRoute(path: AppRoutes.forgotPassword, builder: (_, __) => const ForgotPasswordScreen()),
      GoRoute(
        path: AppRoutes.resetPassword,
        builder: (_, state) => ResetPasswordScreen(token: state.uri.queryParameters['token']),
      ),
      GoRoute(path: AppRoutes.profileSetup, builder: (_, __) => const AccountProfileSetupScreen()),
      GoRoute(path: AppRoutes.sessionExpired, builder: (_, __) => const SessionExpiredScreen()),
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            MainShellScreen(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            navigatorKey: _shellNavigatorHome,
            routes: [
              GoRoute(path: AppRoutes.home, builder: (_, __) => const DashboardScreen()),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: _shellNavigatorVehicles,
            routes: [
              GoRoute(path: AppRoutes.vehicles, builder: (_, __) => const VehiclesListScreen()),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: _shellNavigatorMap,
            routes: [
              GoRoute(path: AppRoutes.liveMap, builder: (_, __) => const LiveMapScreen()),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: _shellNavigatorTrips,
            routes: [
              GoRoute(path: AppRoutes.trips, builder: (_, __) => const TripsListScreen()),
            ],
          ),
          StatefulShellBranch(
            navigatorKey: _shellNavigatorProfile,
            routes: [
              GoRoute(path: AppRoutes.profileTab, builder: (_, __) => const ProfileTabScreen()),
            ],
          ),
        ],
      ),
      GoRoute(
        path: AppRoutes.vehicleDetails,
        builder: (_, state) => VehicleDetailsScreen(vehicleId: state.pathParameters['id']!),
      ),
      GoRoute(path: AppRoutes.devices, builder: (_, __) => const DevicesListScreen()),
      GoRoute(
        path: AppRoutes.deviceDetails,
        builder: (_, state) => DeviceDetailsScreen(deviceId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: AppRoutes.tripDetails,
        builder: (_, state) => TripDetailsScreen(tripId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: AppRoutes.tripPlayback,
        builder: (_, state) => TripPlaybackScreen(tripId: state.pathParameters['id']!),
      ),
      GoRoute(path: AppRoutes.reports, builder: (_, __) => const ReportsScreen()),
      GoRoute(path: AppRoutes.notifications, builder: (_, __) => const NotificationsScreen()),
      GoRoute(path: AppRoutes.settings, builder: (_, __) => const SettingsScreen()),
      GoRoute(path: AppRoutes.editProfile, builder: (_, __) => const EditProfileScreen()),
      GoRoute(path: AppRoutes.changePassword, builder: (_, __) => const ChangePasswordScreen()),
    ],
  );
});

const _publicPaths = {
  AppRoutes.splash,
  AppRoutes.onboarding,
  AppRoutes.login,
  AppRoutes.forgotPassword,
  AppRoutes.resetPassword,
  AppRoutes.sessionExpired,
};

class _RouterRefresh extends ChangeNotifier {
  _RouterRefresh(this._ref) {
    _ref.listen(authControllerProvider, (_, __) => notifyListeners());
    _ref.listen(sessionExpiredProvider, (_, __) => notifyListeners());
  }

  final Ref _ref;
}