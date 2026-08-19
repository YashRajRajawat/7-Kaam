import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:customer_app/main.dart';

void main() {
  testWidgets('7 Kaam Customer App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: CustomerApp(),
      ),
    );
    await tester.pumpAndSettle(const Duration(seconds: 3));
    expect(find.byType(CustomerApp), findsOneWidget);
  });
}
