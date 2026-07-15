import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fastnew/core/theme/app_colors.dart';
import 'package:fastnew/providers/auth_provider.dart';
import 'package:fastnew/features/auth/presentation/widgets/filiere_background.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'dart:convert';
import 'package:image_picker/image_picker.dart';

import 'package:fastnew/features/shared/widgets/shimmer_loading.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  Widget _buildProfileShimmer() {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFF),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Simuler le Header du Profil
            Container(
              width: double.infinity,
              height: 290,
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
              child: const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(height: 40),
                    ShimmerLoading.circular(size: 100),
                    SizedBox(height: 16),
                    ShimmerLoading.rectangular(width: 180, height: 20),
                    SizedBox(height: 8),
                    ShimmerLoading.rectangular(width: 130, height: 14),
                  ],
                ),
              ),
            ),
            // Simuler les détails du profil
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 24.0, vertical: 30.0),
              child: Column(
                children: [
                  ShimmerLoading.rectangular(height: 90),
                  SizedBox(height: 20),
                  ShimmerLoading.rectangular(height: 60),
                  SizedBox(height: 12),
                  ShimmerLoading.rectangular(height: 60),
                  SizedBox(height: 12),
                  ShimmerLoading.rectangular(height: 60),
                  SizedBox(height: 12),
                  ShimmerLoading.rectangular(height: 60),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userDataAsync = ref.watch(userDataProvider);

    return userDataAsync.when(
      loading: () => _buildProfileShimmer(),
      error: (error, stack) => Scaffold(
        body: Center(
          child: Text("Erreur de chargement: ${error.toString()}"),
        ),
      ),
      data: (userData) {
        debugPrint("DEBUG_PROFILE: userData = $userData");
        final filiere = userData?['filiere'] ?? 'MIA';

        final safeUserData = userData ?? {};

        return Scaffold(
          backgroundColor: const Color(0xFFF8FAFF),
          body: FiliereBackground(
            filiere: filiere,
            child: SingleChildScrollView(
              child: Column(
                children: [
                  _buildProfileHeader(context, ref, safeUserData).animate().fadeIn(duration: 600.ms),
                  Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      children: [
                        _buildStatsRow().animate().fadeIn(delay: 300.ms).slideY(begin: 0.1),
                        const SizedBox(height: 32),
                        _buildMenuSection("Compte", [
                          _buildMenuItem(
                            LucideIcons.user,
                            "Informations Personnelles",
                            "Consulter & modifier vos données",
                            onTap: () => _showPersonalInfosBottomSheet(context, safeUserData),
                          ),
                          _buildMenuItem(
                            LucideIcons.shield,
                            "Sécurité & Mot de passe",
                            "Réinitialiser ou modifier votre mot de passe",
                            onTap: () => _showChangePasswordSheet(context, safeUserData),
                          ),
                        ]).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1),
                        const SizedBox(height: 24),
                        _buildMenuSection("Préférences", [
                          _buildMenuItem(LucideIcons.bell, "Notifications", "Alertes de paiement"),
                          _buildMenuItem(LucideIcons.languages, "Langue", "Français"),
                        ]).animate().fadeIn(delay: 500.ms).slideY(begin: 0.1),
                        const SizedBox(height: 32),
                        _buildLogoutButton(context, ref).animate().fadeIn(delay: 700.ms),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildProfileHeader(BuildContext context, WidgetRef ref, Map<String, dynamic> userData) {
    final String prenom = userData['prenom'] ?? '';
    final String nom = userData['nom'] ?? 'Étudiant';
    final String matricule = userData['matricule'] ?? 'N/A';
    final String filiere = userData['filiere'] ?? 'MIA';
    final String email = userData['email'] ?? 'N/A';
    final String? photoUrl = userData['photoUrl'] as String?;
    final String uid = userData['uid'] ?? '';

    ImageProvider imageProvider;
    if (photoUrl != null && photoUrl.startsWith('data:image')) {
      final String base64Str = photoUrl.split(',')[1];
      final bytes = base64Decode(base64Str);
      imageProvider = MemoryImage(bytes);
    } else if (photoUrl != null && photoUrl.isNotEmpty) {
      imageProvider = NetworkImage(photoUrl);
    } else {
      imageProvider = NetworkImage("https://api.dicebear.com/7.x/fun-emoji/png?seed=${Uri.encodeComponent(prenom + nom)}");
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.only(top: 60, bottom: 35),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0056D2), Color(0xFF003D99)],
        ),
        borderRadius: BorderRadius.only(bottomLeft: Radius.circular(40), bottomRight: Radius.circular(40)),
      ),
      child: Column(
        children: [
          GestureDetector(
            onTap: uid.isEmpty ? null : () => _updateProfilePicture(context, ref, uid),
            child: Stack(
              children: [
                Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 4),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.2), blurRadius: 20)],
                  ),
                  child: CircleAvatar(
                    radius: 45,
                    backgroundImage: imageProvider,
                  ),
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                    child: const Icon(LucideIcons.camera, size: 14, color: AppColors.primary),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text("$prenom $nom", style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text("$matricule • $filiere", style: const TextStyle(color: Colors.white70, fontSize: 13)),
          const SizedBox(height: 2),
          Text(email, style: const TextStyle(color: Colors.white60, fontSize: 12, fontStyle: FontStyle.italic)),
        ],
      ),
    );
  }

  Future<void> _updateProfilePicture(BuildContext context, WidgetRef ref, String uid) async {
    final picker = ImagePicker();
    try {
      final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 200,
        maxHeight: 200,
        imageQuality: 75,
      );

      if (image != null) {
        final bytes = await image.readAsBytes();
        final String base64Image = "data:image/jpeg;base64,${base64Encode(bytes)}";

        await FirebaseFirestore.instance
            .collection('users')
            .doc(uid)
            .update({'photoUrl': base64Image});

        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("Photo de profil mise à jour avec succès !"),
              backgroundColor: AppColors.success,
            ),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Erreur lors de la mise à jour de la photo : $e"),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  Widget _buildStatsRow() {
    return Row(
      children: [
        _buildStatCard("12", "TPs Payés", Colors.blue),
        const SizedBox(width: 16),
        _buildStatCard("3", "En attente", Colors.orange),
      ],
    );
  }

  Widget _buildStatCard(String val, String label, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [BoxShadow(color: color.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 5))],
        ),
        child: Column(
          children: [
            Text(val, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
            Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
          ],
        ),
      ),
    );
  }

  Widget _buildMenuSection(String title, List<Widget> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10)],
          ),
          child: Column(children: items),
        ),
      ],
    );
  }

  Widget _buildMenuItem(IconData icon, String title, String sub, {VoidCallback? onTap}) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
        child: Icon(icon, color: AppColors.primary, size: 20),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
      subtitle: Text(sub, style: const TextStyle(fontSize: 12, color: AppColors.textLight)),
      trailing: const Icon(LucideIcons.chevronRight, size: 16),
      onTap: onTap,
    );
  }

  Widget _buildLogoutButton(BuildContext context, WidgetRef ref) {
    return TextButton(
      onPressed: () async {
        await ref.read(authServiceProvider).signOut();
        if (context.mounted) {
          context.go('/login');
        }
      },
      style: TextButton.styleFrom(
        minimumSize: const Size(double.infinity, 60),
        foregroundColor: Colors.redAccent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(LucideIcons.logOut, size: 20),
          SizedBox(width: 12),
          Text("Déconnexion", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        ],
      ),
    );
  }

  void _showChangePasswordSheet(BuildContext context, Map<String, dynamic> userData) {
    final email = userData['email'] as String? ?? FirebaseAuth.instance.currentUser?.email ?? '';
    bool isSending = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(30),
          topRight: Radius.circular(30),
        ),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 24, right: 24, top: 24,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 32,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Center(
                    child: Container(
                      width: 50, height: 5,
                      decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.08),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(LucideIcons.keyRound, color: AppColors.primary, size: 28),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    "Réinitialiser le mot de passe",
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "Un email de réinitialisation sera envoyé à :\n$email",
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.5),
                  ),
                  const SizedBox(height: 28),
                  SizedBox(
                    width: double.infinity,
                    height: 55,
                    child: ElevatedButton(
                      onPressed: isSending || email.isEmpty
                          ? null
                          : () async {
                              setModalState(() => isSending = true);
                              try {
                                await FirebaseAuth.instance.sendPasswordResetEmail(email: email);
                                if (ctx.mounted) {
                                  Navigator.pop(ctx);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text("Email de réinitialisation envoyé !"),
                                      backgroundColor: AppColors.success,
                                    ),
                                  );
                                }
                              } catch (e) {
                                setModalState(() => isSending = false);
                                if (ctx.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text("Erreur : $e"),
                                      backgroundColor: Colors.redAccent,
                                    ),
                                  );
                                }
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                      ),
                      child: isSending
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text(
                              "Envoyer l'email",
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text("Annuler", style: TextStyle(color: AppColors.textLight)),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showPersonalInfosBottomSheet(BuildContext context, Map<String, dynamic> userData) {
    final String currentUid = userData['uid'] ?? FirebaseAuth.instance.currentUser?.uid ?? '';
    final String currentEmail = userData['email'] ?? FirebaseAuth.instance.currentUser?.email ?? '';
    final String currentMatricule = userData['matricule'] ?? 'N/A';
    final String currentFiliere = userData['filiere'] ?? 'N/A';

    final bool isMatriculeEditable = currentMatricule == 'N/A' || currentMatricule.isEmpty;
    final bool isFiliereEditable = currentFiliere == 'N/A' || currentFiliere.isEmpty;

    final nomController = TextEditingController(text: userData['nom'] ?? '');
    final prenomController = TextEditingController(text: userData['prenom'] ?? '');
    final matriculeController = TextEditingController(text: isMatriculeEditable ? '' : currentMatricule);
    final filiereController = TextEditingController(text: isFiliereEditable ? '' : currentFiliere);
    
    final formKey = GlobalKey<FormState>();
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.only(topLeft: Radius.circular(30), topRight: Radius.circular(30)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 24.0,
                right: 24.0,
                top: 24.0,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24.0,
              ),
              child: Form(
                key: formKey,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                    Center(
                      child: Container(
                        width: 50,
                        height: 5,
                        decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      "Informations Personnelles",
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      (isMatriculeEditable || isFiliereEditable)
                          ? "Veuillez initialiser vos informations pour synchroniser votre compte."
                          : "Les champs académiques ne sont modifiables que par l'administration.",
                      style: const TextStyle(fontSize: 12, color: AppColors.textLight),
                    ),
                    const SizedBox(height: 24),
                    
                    // Nom
                    TextFormField(
                      controller: nomController,
                      validator: (v) => v == null || v.trim().isEmpty ? "Requis" : null,
                      decoration: InputDecoration(
                        labelText: "Nom",
                        prefixIcon: const Icon(LucideIcons.user, size: 20),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    
                    // Prénom
                    TextFormField(
                      controller: prenomController,
                      validator: (v) => v == null || v.trim().isEmpty ? "Requis" : null,
                      decoration: InputDecoration(
                        labelText: "Prénom",
                        prefixIcon: const Icon(LucideIcons.user, size: 20),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
                      ),
                    ),
                    const SizedBox(height: 16),

                    if (isMatriculeEditable) ...[
                      TextFormField(
                        controller: matriculeController,
                        validator: (v) => v == null || v.trim().isEmpty ? "Entrez votre numéro matricule" : null,
                        decoration: InputDecoration(
                          labelText: "Numéro Matricule",
                          prefixIcon: const Icon(LucideIcons.hash, size: 20),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    if (isFiliereEditable) ...[
                      TextFormField(
                        controller: filiereController,
                        validator: (v) => v == null || v.trim().isEmpty ? "Entrez votre filière (ex: MIA 1)" : null,
                        decoration: InputDecoration(
                          labelText: "Filière & Niveau",
                          prefixIcon: const Icon(LucideIcons.graduationCap, size: 20),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(15)),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    
                    // Informations Académiques Lecture Seule
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(15),
                        border: Border.all(color: Colors.grey[200]!),
                      ),
                      child: Column(
                        children: [
                          if (!isMatriculeEditable)
                            _buildReadOnlyField("Numéro Matricule", currentMatricule, LucideIcons.hash),
                          if (!isMatriculeEditable && !isFiliereEditable)
                            const Divider(height: 20),
                          if (!isFiliereEditable)
                            _buildReadOnlyField("Filière & Niveau", currentFiliere, LucideIcons.graduationCap),
                          if (!isFiliereEditable)
                            const Divider(height: 20),
                          _buildReadOnlyField("Adresse Email", currentEmail, LucideIcons.mail),
                        ],
                      ),
                    ),
                    const SizedBox(height: 30),
                    
                    // Bouton Enregistrer
                    SizedBox(
                      width: double.infinity,
                      height: 55,
                      child: ElevatedButton(
                        onPressed: isSaving
                            ? null
                            : () async {
                                if (!formKey.currentState!.validate()) return;
                                setModalState(() => isSaving = true);
                                try {
                                  if (currentUid.isEmpty) {
                                    throw "Erreur : ID utilisateur introuvable.";
                                  }

                                  final finalMatricule = isMatriculeEditable ? matriculeController.text.trim() : currentMatricule;

                                  // Si le matricule a été modifié/initialisé, vérifier s'il est unique avant de sauvegarder
                                  if (isMatriculeEditable) {
                                    final duplicateDocs = await FirebaseFirestore.instance
                                        .collection('users')
                                        .where('matricule', isEqualTo: finalMatricule)
                                        .limit(1)
                                        .get();

                                    if (duplicateDocs.docs.isNotEmpty) {
                                      throw "Ce numéro de matricule est déjà enregistré pour un autre compte.";
                                    }
                                  }

                                  await FirebaseFirestore.instance
                                      .collection('users')
                                      .doc(currentUid)
                                      .set({
                                    'uid': currentUid,
                                    'email': currentEmail,
                                    'nom': nomController.text.trim(),
                                    'prenom': prenomController.text.trim(),
                                    'matricule': finalMatricule,
                                    'filiere': isFiliereEditable ? filiereController.text.trim() : currentFiliere,
                                    if (userData['solde'] == null) 'solde': 10000,
                                    'updatedAt': FieldValue.serverTimestamp(),
                                  }, SetOptions(merge: true));

                                  if (context.mounted) {
                                    Navigator.pop(context);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text("Profil mis à jour avec succès !"),
                                        backgroundColor: AppColors.success,
                                      ),
                                    );
                                  }
                                } catch (e) {
                                  setModalState(() => isSaving = false);
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text("Erreur lors de la sauvegarde : $e"),
                                        backgroundColor: Colors.redAccent,
                                      ),
                                    );
                                  }
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                        ),
                        child: isSaving
                            ? const CircularProgressIndicator(color: Colors.white)
                            : const Text("Sauvegarder", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
          },
        );
      },
    );
  }

  Widget _buildReadOnlyField(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.textSecondary),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textLight)),
              const SizedBox(height: 2),
              Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
            ],
          ),
        ),
      ],
    );
  }
}
