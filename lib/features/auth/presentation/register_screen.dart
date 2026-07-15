import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fastnew/core/theme/app_colors.dart';
import 'package:fastnew/providers/auth_provider.dart';
import 'package:fastnew/services/notification_service.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nomController = TextEditingController();
  final _prenomController = TextEditingController();
  final _matriculeController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  String _selectedBaseFiliere = 'MIA'; // Valeur par défaut
  String _selectedLevel = '1'; // Niveau 1 ou 2
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  bool _isLoading = false;

  @override
  void dispose() {
    _nomController.dispose();
    _prenomController.dispose();
    _matriculeController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    ref.read(registeringProvider.notifier).state = true;

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

      final matricule = _matriculeController.text.trim();

      // Vérifier si le matricule est unique et n'est pas déjà enregistré
      final existingMatriculeDocs = await FirebaseFirestore.instance
          .collection('users')
          .where('matricule', isEqualTo: matricule)
          .limit(1)
          .get();

      if (existingMatriculeDocs.docs.isNotEmpty) {
        setState(() => _isLoading = false);
        ref.read(registeringProvider.notifier).state = false;
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Ce numéro de matricule est déjà associé à un autre compte."),
              backgroundColor: Colors.redAccent,
            ),
          );
        }
        return;
      }

      final authService = ref.read(authServiceProvider);
      final userCredential = await authService.signUpWithEmail(
        _emailController.text.trim(),
        _passwordController.text,
      );

      final user = userCredential?.user;
      if (user != null) {
        try {
          // Enregistrer les détails de l'étudiant dans Firestore
          await FirebaseFirestore.instance
              .collection('users')
              .doc(user.uid)
              .set({
            'uid': user.uid,
            'nom': _nomController.text.trim(),
            'prenom': _prenomController.text.trim(),
            'matricule': _matriculeController.text.trim(),
            'filiere': '$_selectedBaseFiliere $_selectedLevel',
            'email': _emailController.text.trim(),
            'solde': 10000, // Solde initial fictif de test
            'createdAt': FieldValue.serverTimestamp(),
          });

          // Envoi de l'email de confirmation (désactivé temporairement)
          // await user.sendEmailVerification();

          // Envoyer une notification de bienvenue
          await NotificationService.sendWelcomeNotification(
            user.uid,
            _prenomController.text.trim(),
          );
        } catch (firestoreError) {
          // Si l'enregistrement dans la base de données échoue, supprimer le compte Auth pour éviter un état incohérent
          try {
            await user.delete();
          } catch (_) {
            // Ignorer l'erreur de suppression si elle échoue également
          }
          throw "Impossible d'initialiser le profil dans la base de données. "
              "Vérifiez que la base de données Firestore a été créée dans votre console Firebase. Détails : $firestoreError";
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Inscription réussie ! Un email de confirmation vous a été envoyé."),
              backgroundColor: AppColors.success,
              duration: Duration(seconds: 4),
            ),
          );
          ref.read(registeringProvider.notifier).state = false;
          context.go('/');
        }
      }
    } catch (e) {
      try {
        await ref.read(authServiceProvider).signOut();
      } catch (_) {}
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Erreur d'inscription : ${e.toString()}"),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) {
        ref.read(registeringProvider.notifier).state = false;
        setState(() => _isLoading = false);
      }
    }
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
                  constraints: const BoxConstraints(maxWidth: 550),
                  child: SingleChildScrollView(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 40.0, vertical: 24.0),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                IconButton(
                                  icon: const Icon(LucideIcons.chevronLeft, color: AppColors.primary),
                                  onPressed: () => context.pop(),
                                ),
                                const SizedBox(width: 8),
                                const Text(
                                  "Inscription Étudiant",
                                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.primary),
                                ),
                              ],
                            ),
                            const SizedBox(height: 24),
                            // Champs Nom et Prénom
                            Row(
                              children: [
                                Expanded(
                                  child: _buildInputField(
                                    controller: _nomController,
                                    label: "Nom",
                                    hint: "Ex: Kouamé",
                                    icon: LucideIcons.user,
                                    validator: (v) => v == null || v.isEmpty ? "Requis" : null,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: _buildInputField(
                                    controller: _prenomController,
                                    label: "Prénom",
                                    hint: "Ex: Jean",
                                    icon: LucideIcons.user,
                                    validator: (v) => v == null || v.isEmpty ? "Requis" : null,
                                  ),
                                ),
                              ],
                            ).animate().fadeIn(delay: 100.ms),
                            const SizedBox(height: 20),
                            
                            // Matricule
                            _buildInputField(
                              controller: _matriculeController,
                              label: "Numéro matricule",
                              hint: "Ex: 21A045",
                              icon: LucideIcons.hash,
                              validator: (v) => v == null || v.isEmpty ? "Veuillez entrer votre matricule" : null,
                            ).animate().fadeIn(delay: 200.ms),
                            const SizedBox(height: 20),

                            // Sélection de la filière
                            const Text(
                              "Sélectionnez votre Filière",
                              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                            ),
                            const SizedBox(height: 10),
                            _buildFiliereSelector().animate().fadeIn(delay: 300.ms),
                            const SizedBox(height: 12),
                            _buildLevelSelector().animate().fadeIn(delay: 350.ms),
                            const SizedBox(height: 20),
                            
                            // Email
                            _buildInputField(
                              controller: _emailController,
                              label: "Adresse Email",
                              hint: "Ex: etudiant@uac.bj",
                              icon: LucideIcons.mail,
                              keyboardType: TextInputType.emailAddress,
                              validator: (v) {
                                if (v == null || v.isEmpty) return "Email requis";
                                if (!v.contains('@')) return "Email invalide";
                                return null;
                              },
                            ).animate().fadeIn(delay: 400.ms),
                            const SizedBox(height: 20),
                            
                            // Mots de passe
                            _buildPasswordField(
                              controller: _passwordController,
                              label: "Mot de passe",
                              obscure: _obscurePassword,
                              onToggle: () => setState(() => _obscurePassword = !_obscurePassword),
                              validator: (v) => v == null || v.length < 6 ? "Minimum 6 caractères" : null,
                            ).animate().fadeIn(delay: 450.ms),
                            const SizedBox(height: 20),
                            
                            _buildPasswordField(
                              controller: _confirmPasswordController,
                              label: "Confirmer le mot de passe",
                              obscure: _obscureConfirmPassword,
                              onToggle: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                              validator: (v) {
                                if (v != _passwordController.text) return "Les mots de passe ne correspondent pas";
                                return null;
                              },
                            ).animate().fadeIn(delay: 500.ms),
                            const SizedBox(height: 32),
                            
                            // Bouton d'inscription
                            SizedBox(
                              width: double.infinity,
                              height: 60,
                              child: ElevatedButton(
                                onPressed: _isLoading ? null : _handleRegister,
                                style: ElevatedButton.styleFrom(
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                                  backgroundColor: AppColors.primary,
                                ),
                                child: _isLoading
                                    ? const CircularProgressIndicator(color: Colors.white)
                                    : const Text("Créer mon compte", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                              ),
                            ).animate().scale(delay: 600.ms),
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
      appBar: AppBar(
        title: const Text("Inscription Étudiant", style: TextStyle(fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(LucideIcons.chevronLeft),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Image.asset(
                    'assets/images/logo.png',
                    height: 90,
                    errorBuilder: (context, error, stackTrace) {
                      return const Icon(LucideIcons.graduationCap, size: 70, color: AppColors.primary);
                    },
                  ),
                ).animate().scale(duration: 500.ms),
                const SizedBox(height: 16),
                const Center(
                  child: Text(
                    "Rejoignez UniPay TP",
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.primary),
                  ),
                ),
                const Center(
                  child: Text(
                    "Créez votre compte académique sécurisé.",
                    style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
                  ),
                ),
                const SizedBox(height: 32),
                
                // Champs Nom et Prénom
                Row(
                  children: [
                    Expanded(
                      child: _buildInputField(
                        controller: _nomController,
                        label: "Nom",
                        hint: "Ex: Kouamé",
                        icon: LucideIcons.user,
                        validator: (v) => v == null || v.isEmpty ? "Requis" : null,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: _buildInputField(
                        controller: _prenomController,
                        label: "Prénom",
                        hint: "Ex: Jean",
                        icon: LucideIcons.user,
                        validator: (v) => v == null || v.isEmpty ? "Requis" : null,
                      ),
                    ),
                  ],
                ).animate().fadeIn(delay: 200.ms),
                const SizedBox(height: 20),
                
                // Matricule
                _buildInputField(
                  controller: _matriculeController,
                  label: "Numéro matricule",
                  hint: "Ex: 21A045",
                  icon: LucideIcons.hash,
                  validator: (v) => v == null || v.isEmpty ? "Veuillez entrer votre matricule" : null,
                ).animate().fadeIn(delay: 300.ms),
                const SizedBox(height: 20),

                // Sélection de la filière
                const Text(
                  "Sélectionnez votre Filière",
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 10),
                _buildFiliereSelector().animate().fadeIn(delay: 400.ms),
                const SizedBox(height: 12),
                _buildLevelSelector().animate().fadeIn(delay: 450.ms),
                const SizedBox(height: 20),
                
                // Email
                _buildInputField(
                  controller: _emailController,
                  label: "Adresse Email",
                  hint: "Ex: etudiant@uac.bj",
                  icon: LucideIcons.mail,
                  keyboardType: TextInputType.emailAddress,
                  validator: (v) {
                    if (v == null || v.isEmpty) return "Email requis";
                    if (!v.contains('@')) return "Email invalide";
                    return null;
                  },
                ).animate().fadeIn(delay: 400.ms),
                const SizedBox(height: 20),
                
                // Mots de passe
                _buildPasswordField(
                  controller: _passwordController,
                  label: "Mot de passe",
                  obscure: _obscurePassword,
                  onToggle: () => setState(() => _obscurePassword = !_obscurePassword),
                  validator: (v) => v == null || v.length < 6 ? "Minimum 6 caractères" : null,
                ).animate().fadeIn(delay: 500.ms),
                const SizedBox(height: 20),
                
                _buildPasswordField(
                  controller: _confirmPasswordController,
                  label: "Confirmer le mot de passe",
                  obscure: _obscureConfirmPassword,
                  onToggle: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                  validator: (v) {
                    if (v != _passwordController.text) return "Les mots de passe ne correspondent pas";
                    return null;
                  },
                ).animate().fadeIn(delay: 550.ms),
                const SizedBox(height: 32),
                

                // Bouton d'inscription
                SizedBox(
                  width: double.infinity,
                  height: 60,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _handleRegister,
                    style: ElevatedButton.styleFrom(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                      backgroundColor: AppColors.primary,
                    ),
                    child: _isLoading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text("Créer mon compte", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ).animate().scale(delay: 700.ms),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
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

  Widget _buildPasswordField({
    required TextEditingController controller,
    required String label,
    required bool obscure,
    required VoidCallback onToggle,
    String? Function(String?)? validator,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          obscureText: obscure,
          validator: validator,
          decoration: InputDecoration(
            hintText: "••••••••",
            prefixIcon: const Icon(LucideIcons.lock, size: 20, color: AppColors.primary),
            suffixIcon: IconButton(
              icon: Icon(obscure ? LucideIcons.eye : LucideIcons.eyeOff, size: 20),
              onPressed: onToggle,
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

  Widget _buildFiliereSelector() {
    final filieres = [
      {'code': 'MIA', 'name': 'Mathématiques & Info'},
      {'code': 'PC', 'name': 'Physique Chimie'},
      {'code': 'CBG', 'name': 'Biologie & Géologie'},
    ];

    return Row(
      children: filieres.map((filiere) {
        bool isSelected = _selectedBaseFiliere == filiere['code'];
        return Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _selectedBaseFiliere = filiere['code']!),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 4),
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : Colors.white,
                borderRadius: BorderRadius.circular(15),
                border: Border.all(
                  color: isSelected ? AppColors.primary : Colors.grey[300]!,
                  width: 1.5,
                ),
                boxShadow: isSelected
                    ? [BoxShadow(color: AppColors.primary.withValues(alpha: 0.2), blurRadius: 8, offset: const Offset(0, 4))]
                    : [],
              ),
              child: Column(
                children: [
                  Text(
                    filiere['code']!,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? Colors.white : AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    filiere['name']!,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 10,
                      color: isSelected ? Colors.white70 : AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildLevelSelector() {
    final levels = ['1', '2'];
    return Row(
      children: levels.map((level) {
        bool isSelected = _selectedLevel == level;
        return Expanded(
          child: GestureDetector(
            onTap: () => setState(() => _selectedLevel = level),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.symmetric(horizontal: 8),
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.primary : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isSelected ? AppColors.primary : Colors.grey[300]!,
                  width: 1.5,
                ),
                boxShadow: isSelected
                    ? [BoxShadow(color: AppColors.primary.withValues(alpha: 0.15), blurRadius: 6, offset: const Offset(0, 3))]
                    : [],
              ),
              child: Center(
                child: Text(
                  "Niveau $level",
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.white : AppColors.textPrimary,
                  ),
                ),
              ),
            ),
          ),
        );
      }).toList(),
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
                    Icon(LucideIcons.userPlus, color: Colors.white, size: 48),
                    SizedBox(width: 16),
                    Text(
                      "Rejoignez UniPay",
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
                  "Créez votre profil en quelques clics pour simplifier vos paiements académiques.",
                  style: TextStyle(color: Colors.white70, fontSize: 16),
                ).animate().fadeIn(delay: 200.ms),
                const SizedBox(height: 60),
                
                _buildLeftPanelFeature(
                  icon: LucideIcons.badgeCheck,
                  title: "Compte Officiel Étudiant",
                  description: "Rattachez vos paiements à votre matricule pour un suivi automatique par l'administration.",
                ).animate().fadeIn(delay: 400.ms).slideX(begin: -0.2),
                const SizedBox(height: 32),
                
                _buildLeftPanelFeature(
                  icon: LucideIcons.layers,
                  title: "Filières et Niveaux",
                  description: "Accédez précisément aux TP correspondants à votre cursus (MIA, PC, CBG).",
                ).animate().fadeIn(delay: 600.ms).slideX(begin: -0.2),
                const SizedBox(height: 32),
                
                _buildLeftPanelFeature(
                  icon: LucideIcons.wallet,
                  title: "Rechargement facile",
                  description: "Un solde étudiant virtuel rechargeable pour payer vos TP en 1 clic.",
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
}
