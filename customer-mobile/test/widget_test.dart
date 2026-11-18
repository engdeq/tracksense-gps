import 'package:customer_mobile/app/app.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('TrackSense app boots', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: TrackSenseApp()));
    await tester.pump(const Duration(milliseconds: 100));
    expect(find.byType(TrackSenseApp), findsOneWidget);
  });
}
