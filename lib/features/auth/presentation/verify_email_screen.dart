import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:fastnew/core/theme/app_colors.dart';
import 'package:fastnew/providers/auth_provider.dart';

class VerifyEmailScreen extends ConsumerStatefulWidget {
  const VerifyEmailScreen({super.key});

  @override
  ConsumerState<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends ConsumerState<VerifyEmailScreen> {
  bool _isChecking = false;
  bool _isResending = false;
  int _resendCooldown = 0;
  Timer? _cooldownTimer;
  String? _feedbackMessage;
  bool _feedbackIsError = false;

  @override
  void dispose() {
    _cooldownTimer?.cancel();
    super.dispose();
  }

  /// Recharge le profil Firebase Auth et redirige si l'email est confirmé.
  Future<void> _checkVerification() async {
    setState(() {
      _isChecking = true;
      _feedbackMessage = null;
    });

    try {
      final user = FirebaseAuth.instance.currentUser;
      await user?.reload();
      final refreshedUser = FirebaseAuth.instance.currentUser;

      if (refreshedUser?.emailVerified == true) {
        if (mounted) {
          // Le router guard détectera le changement et redirigera automatiquement.
          // On force un refresh du router via le provider.
          ref.invalidate(authStateProvider);
          context.go('/');
        }
      } else {
        setState(() {
          _feedbackMessage =
              "Votre email n'est pas encore confirmé. Vérifiez votre boîte de réception (et vos spams).";
          _feedbackIsError = true;
        });
      }
    } catch (e) {
      setState(() {
        _feedbackMessage = "Erreur lors de la vérification : ${e.toString()}";
        _feedbackIsError = true;
      });
    } finally {
      if (mounted) setState(() => _isChecking = false);
    }
  }

  /// Renvoie l'email de vérification avec un cooldown de 60 secondes.
  Future<void> _resendVerificationEmail() async {
    if (_resendCooldown > 0) return;
    setState(() => _isResending = true);

    try {
      final user = FirebaseAuth.instance.currentUser;
      await user?.sendEmailVerification();

      if (mounted) {
        setState(() {
          _resendCooldown = 60;
          _feedbackMessage = "Email de vérification renvoyé ! Consultez votre boîte de réception.";
          _feedbackIsError = false;
        });

        _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
          if (!mounted) {
            timer.cancel();
            return;
          }
          setState(() {
            _resendCooldown--;
            if (_resendCooldown <= 0) {
              timer.cancel();
              _resendCooldown = 0;
            }
          });
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _feedbackMessage = "Impossible de renvoyer l'email : ${e.toString()}";
          _feedbackIsError = true;
        });
      }
    } finally {
      if (mounted) setState(() => _isResending = false);
    }
  }

  Future<void> _signOut() async {
    await ref.read(authServiceProvider).signOut();
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(userProvider);
    final email = user?.email ?? 'votre adresse email';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFF),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Column(
            children: [
              _buildHeader(),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 28.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    const SizedBox(height: 40),

                    // Titre
                    const Text(
                      "Confirmez votre adresse email",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ).animate().fadeIn(duration: 500.ms).slideY(begin: 0.1),

                    const SizedBox(height: 16),

                    // Explication
                    const Text(
                      "Un email de confirmation a été envoyé à :",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 15,
                        color: AppColors.textSecondary,
                      ),
                    ).animate().fadeIn(delay: 100.ms),

                    const SizedBox(height: 10),

                    // Email chip
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(30),
                        border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(LucideIcons.mail, color: AppColors.primary, size: 16),
                          const SizedBox(width: 8),
                          Text(
                            email,
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ).animate().fadeIn(delay: 200.ms).scale(delay: 200.ms, curve: Curves.easeOutBack),

                    const SizedBox(height: 24),

                    // Instruction steps
                    _buildStepCard().animate().fadeIn(delay: 300.ms).slideY(begin: 0.08),

                    // Feedback message
                    if (_feedbackMessage != null) ...[
                      const SizedBox(height: 20),
                      AnimatedContainer(
                        duration: 300.ms,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: (_feedbackIsError ? Colors.redAccent : AppColors.success)
                              .withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: (_feedbackIsError ? Colors.redAccent : AppColors.success)
                                .withValues(alpha: 0.25),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              _feedbackIsError ? LucideIcons.alertCircle : LucideIcons.checkCircle,
                              color: _feedbackIsError ? Colors.redAccent : AppColors.success,
                              size: 20,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                _feedbackMessage!,
                                style: TextStyle(
                                  color: _feedbackIsError ? Colors.redAccent : AppColors.success,
                                  fontSize: 13,
                                  height: 1.4,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ).animate().fadeIn(duration: 300.ms),
                    ],

                    const SizedBox(height: 36),

                    // Bouton principal : j'ai vérifié
                    SizedBox(
                      width: double.infinity,
                      height: 58,
                      child: ElevatedButton.icon(
                        onPressed: _isChecking ? null : _checkVerification,
                        icon: _isChecking
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Icon(LucideIcons.refreshCw, size: 20),
                        label: Text(
                          _isChecking ? "Vérification en cours..." : "J'ai confirmé mon email",
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          elevation: 0,
                        ),
                      ),
                    ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1),

                    const SizedBox(height: 14),

                    // Bouton secondaire : renvoyer l'email
                    SizedBox(
                      width: double.infinity,
                      height: 58,
                      child: OutlinedButton.icon(
                        onPressed: (_isResending || _resendCooldown > 0)
                            ? null
                            : _resendVerificationEmail,
                        icon: _isResending
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                              )
                            : const Icon(LucideIcons.send, size: 18, color: AppColors.primary),
                        label: Text(
                          _resendCooldown > 0
                              ? "Renvoyer l'email (${_resendCooldown}s)"
                              : "Renvoyer l'email de confirmation",
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: BorderSide(
                              color: AppColors.primary.withValues(alpha: _resendCooldown > 0 ? 0.3 : 1.0)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ).animate().fadeIn(delay: 500.ms),

                    const SizedBox(height: 32),

                    // Déconnexion
                    TextButton.icon(
                      onPressed: _signOut,
                      icon: const Icon(LucideIcons.logOut, size: 16, color: AppColors.textLight),
                      label: const Text(
                        "Utiliser un autre compte",
                        style: TextStyle(color: AppColors.textLight, fontSize: 13),
                      ),
                    ).animate().fadeIn(delay: 600.ms),

                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      width: double.infinity,
      height: 260,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0056D2), Color(0xFF003D99)],
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(40),
          bottomRight: Radius.circular(40),
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            top: -40,
            right: -40,
            child: CircleAvatar(
              radius: 90,
              backgroundColor: Colors.white.withValues(alpha: 0.05),
            ),
          ),
          Positioned(
            bottom: -30,
            left: -30,
            child: CircleAvatar(
              radius: 70,
              backgroundColor: Colors.white.withValues(alpha: 0.04),
            ),
          ),
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(LucideIcons.mailCheck, color: Colors.white, size: 52),
                )
                    .animate(onPlay: (controller) => controller.repeat(reverse: true))
                    .scaleXY(
                        begin: 0.92,
                        end: 1.05,
                        duration: 2.seconds,
                        curve: Curves.easeInOut),
                const SizedBox(height: 20),
                const Text(
                  "UniPay TP",
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  "Vérification du compte",
                  style: TextStyle(color: Colors.white70, fontSize: 14),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStepCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Comment confirmer ?",
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 16),
          _buildStep("1", "Ouvrez votre application de messagerie (Gmail, Outlook…)"),
          const SizedBox(height: 12),
          _buildStep("2", "Trouvez l'email envoyé par UniPay TP et cliquez sur le lien de confirmation"),
          const SizedBox(height: 12),
          _buildStep("3", "Revenez ici et cliquez sur « J'ai confirmé mon email »"),
        ],
      ),
    );
  }

  Widget _buildStep(String number, String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 26,
          height: 26,
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.1),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: Text(
              number,
              style: const TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              color: AppColors.textSecondary,
              fontSize: 13,
              height: 1.4,
            ),
          ),
        ),
      ],
    );
  }
}
