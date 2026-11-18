import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final connectivityProvider = Provider<Connectivity>((ref) => Connectivity());

final onlineStatusProvider = StreamProvider<bool>((ref) async* {
  final connectivity = ref.watch(connectivityProvider);
  await for (final results in connectivity.onConnectivityChanged) {
    final online = results.any((r) => r != ConnectivityResult.none);
    yield online;
  }
});