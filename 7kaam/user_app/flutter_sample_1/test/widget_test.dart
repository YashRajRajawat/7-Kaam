import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_sample_1/main.dart';

void main() {
  testWidgets('7 Kaam Worker App builds splash screen', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: SevenKaamWorkerApp()));
    expect(find.text('7'), findsOneWidget);
    expect(find.text('Kaam'), findsOneWidget);
    await tester.pump(const Duration(seconds: 3));
  });
}
