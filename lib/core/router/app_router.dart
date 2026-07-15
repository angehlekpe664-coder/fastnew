import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fastnew/features/splash/presentation/splash_screen.dart';
import 'package:fastnew/features/auth/presentation/login_screen.dart';
import 'package:fastnew/features/auth/presentation/register_screen.dart';
import 'package:fastnew/features/auth/presentation/verify_email_screen.dart';
import 'package:fastnew/features/home/presentation/home_screen.dart';
import 'package:fastnew/features/payment/presentation/payment_screen.dart';
import 'package:fastnew/features/history/presentation/history_screen.dart';
import 'package:fastnew/features/profile/presentation/profile_screen.dart';
import 'package:fastnew/features/notifications/presentation/notifications_screen.dart';
import 'package:fastnew/features/payment/presentation/receipt_screen.dart';
import 'package:fastnew/features/payment/presentation/verification_screen.dart';
import 'package:fastnew/features/admin/presentation/admin_dashboard.dart';
import 'package:fastnew/features/main_layout.dart';
import 'package:fastnew/providers/auth_provider.dart';
import 'package:fastnew/features/payment/presentation/receipt_scanner_screen.dart';

class GoRouterRefreshStream extends ChangeNotifier {
  late final StreamSubscription<dynamic> _subscription;

  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen(
          (dynamic _) => notifyListeners(),
        );
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final router = GoRouter(
    initialLocation: '/splash',
    redirect: (context, state) {
      final authState = ref.read(authStateProvider);
      final isRegisteringState = ref.read(registeringProvider);
      final userData = ref.read(userDataProvider).value;

      if (authState.isLoading || authState.hasError) return null;

      final user = authState.value;
      final isLoggingIn = state.matchedLocation == '/login';
      final isRegistering = state.matchedLocation == '/register';
      final isSplashing = state.matchedLocation == '/splash';
      final isVerifyingEmail = state.matchedLocation == '/verify-email';

      if (user == null) {
        // Utilisateur non connecté : rediriger vers login sauf sur les pages publiques
        if (!isLoggingIn && !isRegistering && !isSplashing) {
          return '/login';
        }
      } else {
        // Si une inscription est en cours, ne pas interrompre le flux
        if (isRegisteringState && isRegistering) {
          return null;
        }

        // ✔️ GARDE EMAIL : bloquer l'accès si l'email n'est pas vérifié (désactivé temporairement)
        // if (!user.emailVerified) {
        //   if (!isVerifyingEmail) {
        //     return '/verify-email';
        //   }
        //   return null;
        // }

        // Vérifier le rôle administrateur dans les données utilisateurs
        final isAdmin = userData?['role'] == 'admin' || userData?['isAdmin'] == true;
        final isAdminRoute = state.matchedLocation == '/admin';

        if (isAdmin) {
          // L'administrateur doit rester sur la route d'administration
          if (isLoggingIn || isRegistering || isSplashing || isVerifyingEmail || !isAdminRoute) {
            return '/admin';
          }
        } else {
          // L'étudiant normal ne doit pas pouvoir aller sur la route d'administration
          if (isAdminRoute) {
            return '/';
          }
          // Rediriger depuis les pages d'auth et l'écran de vérification vers l'accueil
          if (isLoggingIn || isRegistering || isSplashing || isVerifyingEmail) {
            return '/';
          }
        }
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/register',
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: '/verify-email',
        builder: (context, state) => const VerifyEmailScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) {
          return MainLayout(
            location: state.uri.toString(),
            child: child,
          );
        },
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: '/history',
            builder: (context, state) => const HistoryScreen(),
          ),
          GoRoute(
            path: '/notifications',
            builder: (context, state) => const NotificationsScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/payment',
        builder: (context, state) => const PaymentScreen(),
      ),
      GoRoute(
        path: '/scan-receipt',
        builder: (context, state) => const ReceiptScannerScreen(),
      ),
      GoRoute(
        path: '/receipt',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return ReceiptScreen(
            tpTitle: extra?['title'] ?? 'TP Microbiologie Clinique',
            tpCode: extra?['code'] ?? 'BIO-401',
            tpPrice: extra?['price'] ?? '2.500 XAF',
            transactionId: extra?['transactionId'],
          );
        },
      ),
      GoRoute(
        path: '/qr-code',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>?;
          return VerificationScreen(
            tpTitle: extra?['title'] ?? 'TP Microbiologie Clinique',
            tpCode: extra?['code'] ?? 'BIO-401',
            tpPrice: extra?['price'] ?? '2.500 XAF',
            transactionId: extra?['transactionId'] ?? 'TP-789-23410',
          );
        },
      ),
      GoRoute(
        path: '/admin',
        builder: (context, state) => const AdminDashboard(),
      ),
    ],
  );

  // Écouter les changements d'état d'authentification, de profil utilisateur et de création de compte
  // pour rafraîchir le GoRouter sans recréer son instance.
  ref.listen(authStateProvider, (previous, next) {
    router.refresh();
  });

  ref.listen(userDataProvider, (previous, next) {
    router.refresh();
  });

  ref.listen(registeringProvider, (previous, next) {
    router.refresh();
  });

  return router;
});
