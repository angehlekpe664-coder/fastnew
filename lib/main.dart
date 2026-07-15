import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fastnew/core/theme/app_theme.dart';
import 'package:fastnew/core/router/app_router.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialisation de Firebase
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Configurer la persistance hors-ligne Firestore
  try {
    FirebaseFirestore.instance.settings = const Settings(
      persistenceEnabled: true,
      cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
    );
  } catch (e) {
    debugPrint("Failed to configure Firestore settings: $e");
  }
  
  // Désactiver la vérification d'application (Play Integrity / reCAPTCHA invisible)
  // Cela empêche l'erreur [CONFIGURATION_NOT_FOUND] et le network-request-failed
  try {
    await FirebaseAuth.instance.setSettings(appVerificationDisabledForTesting: true);
  } catch (e) {
    debugPrint("Failed to set Firebase Auth settings: $e");
  }
  
  runApp(
    const ProviderScope(
      child: UniPayApp(),
    ),
  );

}

class UniPayApp extends ConsumerWidget {
  const UniPayApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    
    return MaterialApp.router(
      title: 'UniPay TP',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      routerConfig: router,
    );
  }
}
