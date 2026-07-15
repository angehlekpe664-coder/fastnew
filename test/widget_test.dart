import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fastnew/main.dart';
import 'package:fastnew/providers/auth_provider.dart';
import 'package:fastnew/services/auth_service.dart';
import 'package:firebase_auth/firebase_auth.dart';

class FakeAuthService implements AuthService {
  @override
  Stream<User?> get authStateChanges => const Stream.empty();

  @override
  Future<UserCredential?> signInWithEmail(String email, String password) async => null;

  @override
  Future<UserCredential?> signUpWithEmail(String email, String password) async => null;

  @override
  Future<void> signOut() async {}
}

void main() {
  testWidgets('App builds and displays splash screen', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authServiceProvider.overrideWithValue(FakeAuthService()),
          authStateProvider.overrideWith((ref) => Stream.value(null)),
          userDataProvider.overrideWith((ref) => Stream.value(null)),
        ],
        child: const UniPayApp(),
      ),
    );

    // Wait for the stream to emit and the router to build
    await tester.pump(const Duration(milliseconds: 100));

    // Verify that the splash screen shows the application title
    expect(
      find.byWidgetPredicate(
        (widget) => widget is RichText && widget.text.toPlainText().contains('UniPay'),
      ),
      findsOneWidget,
    );
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    // Let the splash screen timer run (3 seconds) to trigger transition to login screen
    await tester.pump(const Duration(seconds: 3));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));

    // Verify that we are now on the login screen
    expect(find.text("Identifiants Académiques"), findsOneWidget);
  });
}

