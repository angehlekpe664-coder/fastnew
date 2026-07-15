import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:fastnew/core/theme/app_colors.dart';
import 'package:fastnew/providers/auth_provider.dart';
import 'package:fastnew/features/auth/presentation/widgets/filiere_background.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _matriculeController = TextEditingController();
  final _passwordController = TextEditingController();
  
  bool _obscurePassword = true;
  bool _isLoading = false;
  bool _isAdminMode = false;

  @override
  void dispose() {
    _matriculeController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);

    try {
      // Vérifier la connexion Internet avant de solliciter Firebase (seulement sur mobile)
      if (!kIsWeb) {
        try {
          final result = await InternetAddress.lookup('firestore.googleapis.com')
              .timeout(const Duration(seconds: 4));
          if (result.isEmpty || result.first.rawAddress.isEmpty) {
            throw Exception();
          }
        } catch (_) {
          throw "Pas de connexion Internet ou problème DNS. Veuillez vérifier votre connexion et désactiver le 'DNS privé' dans vos paramètres Android si nécessaire.";
        }
      }

      final identifier = _matriculeController.text.trim();
      final password = _passwordController.text;
      String email = '';

      if (_isAdminMode) {
        email = identifier;
      } else {
        // 1. Rechercher l'email dans Firestore à partir du matricule
        final querySnapshot = await FirebaseFirestore.instance
            .collection('users')
            .where('matricule', isEqualTo: identifier)
            .limit(1)
            .get();

        if (querySnapshot.docs.isEmpty) {
          throw 'Numéro matricule non enregistré ou incorrect.';
        }

        final userData = querySnapshot.docs.first.data();
        email = userData['email'] as String;
      }

      // 2. Connexion avec Firebase Auth
      final authService = ref.read(authServiceProvider);
      await authService.signInWithEmail(email, password);

      // 3. Vérifier le rôle
      final currentUser = FirebaseAuth.instance.currentUser;
      if (currentUser == null) throw "Une erreur est survenue lors de la connexion.";

      final userDoc = await FirebaseFirestore.instance
          .collection('users')
          .doc(currentUser.uid)
          .get();

      final userData = userDoc.data();
      final isAdmin = userData?['role'] == 'admin' || userData?['isAdmin'] == true;

      if (_isAdminMode && !isAdmin) {
        await authService.signOut();
        throw "Accès refusé. Ce compte ne possède pas de droits d'administration.";
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isAdmin ? "Connexion Administrateur réussie !" : "Connexion réussie !"),
            backgroundColor: AppColors.success,
          ),
        );
        context.go(isAdmin ? '/admin' : '/');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Erreur de connexion : ${e.toString()}"),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _showForgotPasswordDialog() async {
    final emailController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool dialogLoading = false;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              backgroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              title: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.keyRound, color: AppColors.primary, size: 20),
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    "Mot de passe",
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                  ),
                ],
              ),
              content: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Entrez l'adresse email associée à votre compte pour recevoir le lien de réinitialisation.",
                      style: TextStyle(color: AppColors.textSecondary, fontSize: 13, height: 1.4),
                    ),
                    const SizedBox(height: 20),
                    TextFormField(
                      controller: emailController,
                      keyboardType: TextInputType.emailAddress,
                      decoration: InputDecoration(
                        labelText: "Adresse Email",
                        hintText: "etudiant@uac.bj",
                        prefixIcon: const Icon(LucideIcons.mail, size: 18, color: AppColors.primary),
                        filled: true,
                        fillColor: Colors.grey[50],
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide.none),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide(color: Colors.grey[200]!)),
                      ),
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return "Veuillez entrer votre adresse email";
                        }
                        if (!value.contains('@')) {
                          return "Veuillez entrer un email valide";
                        }
                        return null;
                      },
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: dialogLoading ? null : () => Navigator.pop(context),
                  child: const Text("Annuler", style: TextStyle(color: AppColors.textLight)),
                ),
                ElevatedButton(
                  onPressed: dialogLoading
                      ? null
                      : () async {
                          if (!formKey.currentState!.validate()) return;
                          setDialogState(() => dialogLoading = true);

                          try {
                            await FirebaseAuth.instance.sendPasswordResetEmail(
                              email: emailController.text.trim(),
                            );
                            if (context.mounted) {
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text("Email de réinitialisation envoyé avec succès !"),
                                  backgroundColor: AppColors.success,
                                ),
                              );
                            }
                          } catch (e) {
                            setDialogState(() => dialogLoading = false);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text("Erreur : ${e.toString()}"),
                                  backgroundColor: Colors.redAccent,
                                ),
                              );
                            }
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: dialogLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text("Envoyer"),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildLoginModeSelector() {
    return Container(
      height: 52,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth / 2;
          return Stack(
            children: [
              AnimatedAlign(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeInOut,
                alignment: _isAdminMode ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  width: width,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.05),
                        blurRadius: 5,
                        offset: const Offset(0, 2),
                      )
                    ],
                  ),
                ),
              ),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        if (_isAdminMode) {
                          setState(() {
                            _isAdminMode = false;
                            _matriculeController.clear();
                            _passwordController.clear();
                          });
                        }
                      },
                      behavior: HitTestBehavior.opaque,
                      child: Center(
                        child: Text(
                          "Étudiant",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: !_isAdminMode ? AppColors.primary : AppColors.textLight,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        if (!_isAdminMode) {
                          setState(() {
                            _isAdminMode = true;
                            _matriculeController.clear();
                            _passwordController.clear();
                          });
                        }
                      },
                      behavior: HitTestBehavior.opaque,
                      child: Center(
                        child: Text(
                          "Administrateur",
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _isAdminMode ? AppColors.primary : AppColors.textLight,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final double width = MediaQuery.of(context).size.width;
    final bool isDesktop = width >= 900;

    if (isDesktop) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        body: Row(
          children: [
            Expanded(
              flex: 5,
              child: _buildDesktopLeftPanel(),
            ),
            Expanded(
              flex: 6,
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 480),
                  child: SingleChildScrollView(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 40.0, vertical: 24.0),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Center(
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withValues(alpha: 0.05),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(LucideIcons.graduationCap, color: AppColors.primary, size: 40),
                              ),
                            ),
                            const SizedBox(height: 24),
                            Center(
                              child: Text(
                                _isAdminMode ? "Espace Administration" : "Identifiants Académiques",
                                textAlign: TextAlign.center,
                                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.primary),
                              ).animate().fadeIn(),
                            ),
                            const SizedBox(height: 8),
                            Center(
                              child: Text(
                                _isAdminMode
                                    ? "Authentifiez-vous pour gérer les transactions."
                                    : "Accédez à la plateforme UniPay.",
                                textAlign: TextAlign.center,
                                style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
                              ).animate().fadeIn(),
                            ),
                            const SizedBox(height: 32),
                            _buildLoginModeSelector().animate().fadeIn(delay: 100.ms),
                            const SizedBox(height: 24),
                            _buildInputField(
                              controller: _matriculeController,
                              label: _isAdminMode ? "Email Administrateur" : "Numéro matricule",
                              hint: _isAdminMode ? "Ex: admin@uac.bj" : "Ex: 22A045",
                              icon: _isAdminMode ? LucideIcons.mail : LucideIcons.user,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return _isAdminMode
                                      ? "Veuillez entrer votre email"
                                      : "Veuillez entrer votre matricule";
                                }
                                if (_isAdminMode && !value.contains('@')) {
                                  return "Veuillez entrer un email valide";
                                }
                                return null;
                              },
                            ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1),
                            const SizedBox(height: 20),
                            _buildPasswordField().animate().fadeIn(delay: 300.ms).slideY(begin: 0.1),
                            const SizedBox(height: 32),
                            _buildLoginButton(context).animate().scale(delay: 400.ms, curve: Curves.easeOutBack),
                            if (!_isAdminMode) ...[
                              const SizedBox(height: 24),
                              _buildGuestOption().animate().fadeIn(delay: 500.ms),
                            ],
                            const SizedBox(height: 40),
                            _buildFooter().animate().fadeIn(delay: 600.ms),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFF),
      body: FiliereBackground(
        filiere: 'ALL',
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              children: [
                _buildHeader(context),
                Padding(
                  padding: const EdgeInsets.all(28.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _isAdminMode ? "Espace Administration" : "Identifiants Académiques",
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.primary),
                      ).animate().fadeIn(duration: 600.ms).slideX(begin: -0.2),
                      const SizedBox(height: 8),
                      Text(
                        _isAdminMode
                            ? "Authentifiez-vous pour gérer les transactions et suivre les inscriptions."
                            : "Accédez à la plateforme UniPay de la Faculté des Sciences.",
                        style: const TextStyle(fontSize: 15, color: AppColors.textSecondary),
                      ).animate().fadeIn(delay: 200.ms),
                      const SizedBox(height: 24),
                      
                      _buildLoginModeSelector().animate().fadeIn(delay: 300.ms),
                      const SizedBox(height: 24),
                      
                      _buildInputField(
                        controller: _matriculeController,
                        label: _isAdminMode ? "Email Administrateur" : "Numéro matricule",
                        hint: _isAdminMode ? "Ex: admin@uac.bj" : "Ex: 22A045",
                        icon: _isAdminMode ? LucideIcons.mail : LucideIcons.user,
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return _isAdminMode
                                ? "Veuillez entrer votre email"
                                : "Veuillez entrer votre matricule";
                          }
                          if (_isAdminMode && !value.contains('@')) {
                            return "Veuillez entrer un email valide";
                          }
                          return null;
                        },
                      ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1),
                      
                      const SizedBox(height: 20),
                      
                      _buildPasswordField().animate().fadeIn(delay: 500.ms).slideY(begin: 0.1),
                      
                      const SizedBox(height: 32),
                      
                      _buildLoginButton(context).animate().scale(delay: 700.ms, curve: Curves.easeOutBack),
                      
                      if (!_isAdminMode) ...[
                        const SizedBox(height: 24),
                        _buildGuestOption().animate().fadeIn(delay: 900.ms),
                      ],
                      
                      const SizedBox(height: 40),
                      _buildFooter().animate().fadeIn(delay: 1.seconds),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDesktopLeftPanel() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0056D2), Color(0xFF003D99)],
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: -100,
            left: -100,
            child: CircleAvatar(radius: 200, backgroundColor: Colors.white.withValues(alpha: 0.03)),
          ),
          Positioned(
            bottom: -50,
            right: -50,
            child: CircleAvatar(radius: 150, backgroundColor: Colors.white.withValues(alpha: 0.03)),
          ),
          Padding(
            padding: const EdgeInsets.all(60.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Row(
                  children: [
                    Icon(LucideIcons.graduationCap, color: Colors.white, size: 48),
                    SizedBox(width: 16),
                    Text(
                      "UniPay TP",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.5,
                      ),
                    ),
                  ],
                ).animate().fadeIn(duration: 500.ms).slideY(begin: -0.2),
                const SizedBox(height: 8),
                const Text(
                  "Faculté des Sciences - Université d'Abomey-Calavi",
                  style: TextStyle(color: Colors.white70, fontSize: 16),
                ).animate().fadeIn(delay: 200.ms),
                const SizedBox(height: 60),
                
                _buildLeftPanelFeature(
                  icon: LucideIcons.shieldCheck,
                  title: "Paiement en ligne instantané",
                  description: "Réglez vos frais de TP de manière sécurisée avec Mobile Money ou carte bancaire.",
                ).animate().fadeIn(delay: 400.ms).slideX(begin: -0.2),
                const SizedBox(height: 32),
                
                _buildLeftPanelFeature(
                  icon: LucideIcons.wand2,
                  title: "Validation de quittances par IA",
                  description: "Importez vos reçus de banque pour une vérification et validation automatique immédiate.",
                ).animate().fadeIn(delay: 600.ms).slideX(begin: -0.2),
                const SizedBox(height: 32),
                
                _buildLeftPanelFeature(
                  icon: LucideIcons.history,
                  title: "Historique et alertes",
                  description: "Gardez une trace de tous vos reçus et recevez des notifications instantanées.",
                ).animate().fadeIn(delay: 800.ms).slideX(begin: -0.2),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLeftPanelFeature({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.1),
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white24, width: 1),
          ),
          child: Icon(icon, color: Colors.white, size: 24),
        ),
        const SizedBox(width: 20),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                description,
                style: const TextStyle(color: Colors.white70, fontSize: 14, height: 1.4),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 300,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0056D2), Color(0xFF003D99)],
        ),
        borderRadius: BorderRadius.only(bottomLeft: Radius.circular(40), bottomRight: Radius.circular(40)),
      ),
      child: Stack(
        children: [
          Positioned(
            top: -50,
            right: -50,
            child: CircleAvatar(radius: 100, backgroundColor: Colors.white.withValues(alpha: 0.05)),
          ),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(LucideIcons.graduationCap, color: Colors.white, size: 80)
                    .animate(onPlay: (controller) => controller.repeat(reverse: true))
                    .moveY(begin: -10, end: 10, duration: 2.seconds, curve: Curves.easeInOut),
                const SizedBox(height: 16),
                const Text("UniPay TP", style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
                const Text("UAC - Faculté des Sciences", style: TextStyle(color: Colors.white70, fontSize: 14)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          validator: validator,
          decoration: InputDecoration(
            hintText: hint,
            prefixIcon: Icon(icon, size: 20, color: AppColors.primary),
            filled: true,
            fillColor: Colors.grey[50],
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide.none),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide(color: Colors.grey[200]!)),
          ),
        ),
      ],
    );
  }

  Widget _buildPasswordField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text("Mot de passe", style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
            TextButton(
              onPressed: _showForgotPasswordDialog,
              child: const Text("Oublié ?", style: TextStyle(fontSize: 12, color: AppColors.primary)),
            ),
          ],
        ),
        TextFormField(
          controller: _passwordController,
          obscureText: _obscurePassword,
          validator: (value) {
            if (value == null || value.isEmpty) {
              return "Veuillez entrer votre mot de passe";
            }
            if (value.length < 6) {
              return "Minimum 6 caractères";
            }
            return null;
          },
          decoration: InputDecoration(
            hintText: "••••••••",
            prefixIcon: const Icon(LucideIcons.lock, size: 20, color: AppColors.primary),
            suffixIcon: IconButton(
              icon: Icon(_obscurePassword ? LucideIcons.eye : LucideIcons.eyeOff, size: 20),
              onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
            ),
            filled: true,
            fillColor: Colors.grey[50],
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide.none),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(15), borderSide: BorderSide(color: Colors.grey[200]!)),
          ),
        ),
      ],
    );
  }

  Widget _buildLoginButton(BuildContext context) {
    return Container(
      width: double.infinity,
      height: 60,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(15),
        boxShadow: [BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 10, offset: const Offset(0, 5))],
      ),
      child: ElevatedButton(
        onPressed: _isLoading ? null : _handleLogin,
        style: ElevatedButton.styleFrom(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
          backgroundColor: AppColors.primary,
        ),
        child: _isLoading
            ? const Center(child: CircularProgressIndicator(color: Colors.white))
            : const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text("Se connecter", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  SizedBox(width: 10),
                  Icon(LucideIcons.arrowRight, size: 20),
                ],
              ),
      ),
    );
  }

  Widget _buildGuestOption() {
    return Center(
      child: OutlinedButton(
        onPressed: () => context.push('/register'),
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(double.infinity, 60),
          side: BorderSide(color: AppColors.primary.withValues(alpha: 0.5)),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
        ),
        child: const Text("Accès Invité / Inscription", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600)),
      ),
    );
  }

  Widget _buildFooter() {
    return const Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.shieldCheck, color: AppColors.success, size: 18),
            SizedBox(width: 8),
            Text("PAIEMENT SÉCURISÉ & CHIFFRÉ", style: TextStyle(color: AppColors.success, fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        ),
        SizedBox(height: 40),
        Text("© 2024 Université d'Abomey-Calavi", style: TextStyle(color: AppColors.textLight, fontSize: 12)),
      ],
    );
  }
}
