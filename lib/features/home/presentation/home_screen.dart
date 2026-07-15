import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fastnew/core/theme/app_colors.dart';
import 'package:fastnew/providers/auth_provider.dart';
import 'package:fastnew/features/auth/presentation/widgets/filiere_background.dart';
import 'package:fastnew/features/shared/widgets/shimmer_loading.dart';


class TPModel {
  final String title;
  final String code;
  final String price;
  final Color color;
  final IconData icon;

  TPModel({
    required this.title,
    required this.code,
    required this.price,
    required this.color,
    required this.icon,
  });
}

List<TPModel> getTPsForFiliere(String filiere) {

  // ─── MIA ──────────────────────────────────────────────────────────────────
  // MIA 1 : Semestre 1 → aucun TP / Semestre 2 → Physique Expérimental
  final List<TPModel> mia1 = [
    TPModel(
      title: "Physique Expérimental",
      code: "PHY1121",
      price: "2.500 FCFA",
      color: Colors.purple,
      icon: LucideIcons.activity,
    ),
  ];

  // MIA 2 : Semestre 3 → Mécanique Expérimental / Semestre 4 → LaTeX + Python & Scilab
  final List<TPModel> mia2 = [
    TPModel(
      title: "Mécanique Expérimental",
      code: "PHY1322",
      price: "2.500 FCFA",
      color: Colors.deepOrange,
      icon: LucideIcons.cpu,
    ),
    TPModel(
      title: "LaTeX",
      code: "INF1422",
      price: "1.500 FCFA",
      color: Colors.indigo,
      icon: LucideIcons.fileText,
    ),
    TPModel(
      title: "Python & Scilab",
      code: "INF1421",
      price: "1.500 FCFA",
      color: Colors.blue,
      icon: LucideIcons.code,
    ),
  ];

  // ─── PC ───────────────────────────────────────────────────────────────────
  // PC 1 : TP Physique + TP Chimie Expérimental + Informatique
  final List<TPModel> pc1 = [
    // — TP Physique
    TPModel(
      title: "Mécanique et Électricité",
      code: "PHY1225-1",
      price: "2.500 FCFA",
      color: Colors.deepPurple,
      icon: LucideIcons.zap,
    ),
    TPModel(
      title: "Optique",
      code: "PHY1225-2",
      price: "2.500 FCFA",
      color: Colors.purple,
      icon: LucideIcons.sun,
    ),
    // — TP Chimie Expérimental
    TPModel(
      title: "Chimie Générale",
      code: "CHM1226-1",
      price: "2.500 FCFA",
      color: Colors.teal,
      icon: LucideIcons.flaskConical,
    ),
    TPModel(
      title: "Chimie Minérale",
      code: "CHM1226-2",
      price: "2.500 FCFA",
      color: Colors.cyan,
      icon: LucideIcons.beaker,
    ),
    TPModel(
      title: "Chimie Organique",
      code: "CHM1226-3",
      price: "2.500 FCFA",
      color: Colors.green,
      icon: LucideIcons.flaskConical,
    ),
    // — Informatique
    TPModel(
      title: "Informatique",
      code: "INF1120",
      price: "1.500 FCFA",
      color: Colors.blue,
      icon: LucideIcons.monitor,
    ),
  ];

  // PC 2 : Chimie (3 TPs) + Physique HONFO (Électronique + Thermodynamique)
  final List<TPModel> pc2 = [
    // — Chimie
    TPModel(
      title: "Chimie Organique Descriptif",
      code: "CHM1321",
      price: "2.500 FCFA",
      color: Colors.green,
      icon: LucideIcons.flaskConical,
    ),
    TPModel(
      title: "Chimie des Matériaux",
      code: "CHM1323",
      price: "2.500 FCFA",
      color: Colors.orange,
      icon: LucideIcons.layers,
    ),
    TPModel(
      title: "Chimie des Solutions",
      code: "CHM1325",
      price: "2.500 FCFA",
      color: Colors.teal,
      icon: LucideIcons.droplets,
    ),
    // — Physique (HONFO Thérèse)
    TPModel(
      title: "Électronique",
      code: "PHY1426-2",
      price: "3.000 FCFA",
      color: Colors.deepPurple,
      icon: LucideIcons.cpu,
    ),
    TPModel(
      title: "Thermodynamique",
      code: "PHY1426-3",
      price: "3.000 FCFA",
      color: Colors.red,
      icon: LucideIcons.flame,
    ),
  ];

  // ─── CBG (à compléter avec les vrais codes) ────────────────────────────────
  final List<TPModel> cbg1 = [
    TPModel(
      title: "Biologie Cellulaire",
      code: "BIO-101",
      price: "2.500 FCFA",
      color: Colors.green,
      icon: LucideIcons.leaf,
    ),
    TPModel(
      title: "Géologie Générale",
      code: "GEO-101",
      price: "2.000 FCFA",
      color: Colors.brown,
      icon: LucideIcons.globe,
    ),
  ];
  final List<TPModel> cbg2 = [
    TPModel(
      title: "Physiologie Animale",
      code: "BIO-201",
      price: "2.500 FCFA",
      color: Colors.redAccent,
      icon: LucideIcons.heart,
    ),
    TPModel(
      title: "Biochimie Structurale",
      code: "BIO-202",
      price: "3.000 FCFA",
      color: Colors.blueGrey,
      icon: LucideIcons.flaskConical,
    ),
  ];

  // ─── ENT ──────────────────────────────────────────────────────────────────
  final List<TPModel> ent1 = [
    TPModel(
      title: "Création d'Entreprise",
      code: "ENT-101",
      price: "1.500 FCFA",
      color: Colors.orange,
      icon: LucideIcons.briefcase,
    ),
    TPModel(
      title: "Marketing & Vente",
      code: "ENT-102",
      price: "1.000 FCFA",
      color: Colors.teal,
      icon: LucideIcons.trendingUp,
    ),
  ];
  final List<TPModel> ent2 = [
    TPModel(
      title: "Gestion de Projet",
      code: "ENT-201",
      price: "2.000 FCFA",
      color: Colors.purple,
      icon: LucideIcons.rocket,
    ),
    TPModel(
      title: "Comptabilité de Base",
      code: "ENT-202",
      price: "2.500 FCFA",
      color: Colors.blue,
      icon: LucideIcons.pieChart,
    ),
  ];

  // ─── Retro-compatibilité (filière sans niveau) ─────────────────────────────
  if (filiere == 'MIA') return mia1;
  if (filiere == 'PC')  return pc1;
  if (filiere == 'CBG') return cbg1;
  if (filiere == 'ENT' || filiere == 'Entrepreneuriat') return ent1;

  // ─── Sélection par niveau ──────────────────────────────────────────────────
  switch (filiere) {
    case 'MIA 1':
      return mia1;
    case 'MIA 2':
      return [...mia1, ...mia2];
    case 'PC 1':
      return pc1;
    case 'PC 2':
      return [...pc1, ...pc2];
    case 'CBG 1':
      return cbg1;
    case 'CBG 2':
      return [...cbg1, ...cbg2];
    case 'ENT 1':
    case 'ENTREPRENEURIAT 1':
      return ent1;
    case 'ENT 2':
    case 'ENTREPRENEURIAT 2':
      return [...ent1, ...ent2];
    default:
      return [];
  }
}

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  Widget _buildHomeShimmer(BuildContext context) {
    final double width = MediaQuery.of(context).size.width;
    final bool isDesktop = width >= 900;

    if (isDesktop) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(40.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const ShimmerLoading.rectangular(height: 120, borderRadius: BorderRadius.all(Radius.circular(24))),
              const SizedBox(height: 40),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 2,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const ShimmerLoading.rectangular(width: 200, height: 24),
                        const SizedBox(height: 20),
                        GridView.builder(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                            maxCrossAxisExtent: 220,
                            mainAxisSpacing: 20,
                            crossAxisSpacing: 20,
                            childAspectRatio: 1.1,
                          ),
                          itemCount: 4,
                          itemBuilder: (context, index) => const ShimmerLoading.rectangular(height: 180, borderRadius: BorderRadius.all(Radius.circular(24))),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 40),
                  Expanded(
                    flex: 1,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const ShimmerLoading.rectangular(width: 150, height: 24),
                        const SizedBox(height: 20),
                        const ShimmerLoading.rectangular(height: 100, borderRadius: BorderRadius.all(Radius.circular(20))),
                        const SizedBox(height: 16),
                        const ShimmerLoading.rectangular(height: 100, borderRadius: BorderRadius.all(Radius.circular(20))),
                        const SizedBox(height: 40),
                        const ShimmerLoading.rectangular(width: 150, height: 24),
                        const SizedBox(height: 20),
                        const ShimmerLoading.rectangular(height: 70, borderRadius: BorderRadius.all(Radius.circular(16))),
                        const SizedBox(height: 12),
                        const ShimmerLoading.rectangular(height: 70, borderRadius: BorderRadius.all(Radius.circular(16))),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFF),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 220.0,
            floating: false,
            pinned: true,
            elevation: 0,
            backgroundColor: AppColors.primary,
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [Color(0xFF0056D2), Color(0xFF003D99)],
                  ),
                ),
                child: const Stack(
                  children: [
                    Positioned(
                      top: 60,
                      left: 20,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ShimmerLoading.rectangular(width: 140, height: 16),
                          SizedBox(height: 12),
                          ShimmerLoading.rectangular(width: 180, height: 32),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const ShimmerLoading.rectangular(width: 150, height: 18),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 180,
                    child: ListView.builder(
                      scrollDirection: Axis.horizontal,
                      itemCount: 2,
                      itemBuilder: (context, index) {
                        return Container(
                          width: 150,
                          margin: const EdgeInsets.only(right: 12),
                          child: const ShimmerLoading.rectangular(height: 180),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 32),
                  const Row(
                    children: [
                      Expanded(child: ShimmerLoading.rectangular(height: 80)),
                      SizedBox(width: 16),
                      Expanded(child: ShimmerLoading.rectangular(height: 80)),
                    ],
                  ),
                  const SizedBox(height: 32),
                  const ShimmerLoading.rectangular(width: 150, height: 18),
                  const SizedBox(height: 16),
                  const ShimmerLoading.rectangular(height: 70),
                  const SizedBox(height: 12),
                  const ShimmerLoading.rectangular(height: 70),
                  const SizedBox(height: 12),
                  const ShimmerLoading.rectangular(height: 70),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userDataAsync = ref.watch(userDataProvider);
    final paymentsAsync = ref.watch(userPaymentsProvider);

    return userDataAsync.when(
      loading: () => _buildHomeShimmer(context),
      error: (error, stack) => Scaffold(
        body: Center(
          child: Text("Erreur de chargement du profil: ${error.toString()}"),
        ),
      ),
      data: (userData) {
        final nom = userData?['nom'] ?? 'Étudiant';
        final prenom = userData?['prenom'] ?? '';
        final filiere = userData?['filiere'] ?? 'MIA';
        
        // Formatter le solde en FCFA
        final rawSolde = userData?['solde'] ?? 0;
        final soldeStr = "$rawSolde FCFA";

        final payments = paymentsAsync.value ?? [];

        final double width = MediaQuery.of(context).size.width;
        final bool isDesktop = width >= 900;

        if (isDesktop) {
          return Scaffold(
            backgroundColor: const Color(0xFFF8FAFC),
            body: FiliereBackground(
              filiere: filiere,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(40.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildDesktopHeader(context, prenom, nom, soldeStr),
                    const SizedBox(height: 40),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          flex: 2,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildSectionHeader("Travaux Pratiques disponibles", "Voir tout"),
                              const SizedBox(height: 20),
                              _buildDesktopTPGrid(filiere, payments),
                            ],
                          ),
                        ),
                        const SizedBox(width: 40),
                        Expanded(
                          flex: 1,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "Raccourcis & Actions",
                                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1A1C1E)),
                              ),
                              const SizedBox(height: 20),
                              _buildDesktopActionCards(context),
                              const SizedBox(height: 40),
                              _buildSectionHeader(
                                "Dernières activités",
                                "Historique",
                                onTap: () => context.go('/history'),
                              ),
                              const SizedBox(height: 20),
                              _buildRecentActivities(payments),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        return Scaffold(
          backgroundColor: const Color(0xFFF8FAFF),
          body: FiliereBackground(
            filiere: filiere,
            child: CustomScrollView(
              slivers: [
                _buildSliverAppBar(context, prenom, nom, soldeStr),
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildSectionHeader("TPs prioritaires", "Voir tout"),
                        const SizedBox(height: 16),
                        _buildPendingTPList(filiere, payments),
                        const SizedBox(height: 32),
                        _buildActionCards(context),
                        const SizedBox(height: 32),
                        _buildSectionHeader(
                          "Dernières activités",
                          "Historique",
                          onTap: () => context.go('/history'),
                        ),
                        const SizedBox(height: 16),
                        _buildRecentActivities(payments),
                      ],
                    ),
                  ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.1),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildDesktopHeader(BuildContext context, String prenom, String nom, String solde) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 32),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0056D2), Color(0xFF003D99)],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0056D2).withValues(alpha: 0.2),
            blurRadius: 20,
            offset: const Offset(0, 10),
          )
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                "Bonjour, $prenom $nom",
                style: const TextStyle(color: Colors.white70, fontSize: 16),
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  const Text(
                    "Solde étudiant : ",
                    style: TextStyle(color: Colors.white70, fontSize: 18),
                  ),
                  Text(
                    solde,
                    style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ],
          ).animate().fadeIn(delay: 200.ms).slideX(),
          ElevatedButton.icon(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text("Le rechargement de solde n'est pas disponible dans cette version."),
                  backgroundColor: AppColors.primary,
                ),
              );
            },
            icon: const Icon(LucideIcons.plus, size: 18),
            label: const Text("Recharger mon compte", style: TextStyle(fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              elevation: 0,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDesktopTPGrid(String filiere, List<Map<String, dynamic>> payments) {
    final tps = getTPsForFiliere(filiere);

    if (tps.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(40),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
        ),
        child: const Center(
          child: Text(
            "Aucun TP disponible pour votre filière.",
            style: TextStyle(color: AppColors.textLight, fontSize: 16),
          ),
        ),
      );
    }

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 220,
        mainAxisSpacing: 20,
        crossAxisSpacing: 20,
        childAspectRatio: 1.1,
      ),
      itemCount: tps.length,
      itemBuilder: (context, index) {
        final tp = tps[index];
        final isPaid = payments.any((p) => p['tpCode'] == tp.code && p['verified'] == true);
        final paidTxId = isPaid ? payments.firstWhere((p) => p['tpCode'] == tp.code)['transactionId'] : null;

        return _buildTPCard(
          context, tp.title, tp.code, tp.price, tp.color, tp.icon, isPaid, paidTxId
        );
      },
    );
  }

  Widget _buildDesktopActionCards(BuildContext context) {
    return Column(
      children: [
        _buildDesktopActionCard(
          context,
          title: "Payer un TP",
          subtitle: "Réglez vos TP instantanément par Mobile Money.",
          btnText: "Payer",
          icon: LucideIcons.wallet,
          color: const Color(0xFF0056D2),
          onPressed: () => context.push('/payment'),
        ),
        const SizedBox(height: 16),
        _buildDesktopActionCard(
          context,
          title: "Scanner IA",
          subtitle: "Vérifiez vos quittances bancaires automatiquement.",
          btnText: "Scanner",
          icon: LucideIcons.wand2,
          color: const Color(0xFF0D9488),
          onPressed: () => context.push('/scan-receipt'),
        ),
      ],
    );
  }

  Widget _buildDesktopActionCard(
    BuildContext context, {
    required String title,
    required String subtitle,
    required String btnText,
    required IconData icon,
    required Color color,
    required VoidCallback onPressed,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
        border: Border.all(color: Colors.grey[100]!),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1A1C1E)),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          ElevatedButton(
            onPressed: onPressed,
            style: ElevatedButton.styleFrom(
              backgroundColor: color,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: Text(btnText),
          ),
        ],
      ),
    );
  }

  Widget _buildSliverAppBar(BuildContext context, String prenom, String nom, String solde) {
    return SliverAppBar(
      expandedHeight: 220.0,
      floating: false,
      pinned: true,
      elevation: 0,
      backgroundColor: AppColors.primary,
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
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
                top: 60,
                left: 20,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Bonjour, $prenom $nom", 
                      style: const TextStyle(color: Colors.white70, fontSize: 16)),
                    const SizedBox(height: 8),
                    Text(solde, 
                      style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
                  ],
                ).animate().fadeIn(delay: 200.ms).slideX(),
              ),
              Positioned(
                bottom: 20,
                right: 20,
                child: GestureDetector(
                  onTap: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text("Le rechargement de solde n'est pas disponible dans cette version."),
                        backgroundColor: AppColors.primary,
                      ),
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Row(
                      children: [
                        Icon(LucideIcons.plus, color: Colors.white, size: 16),
                        SizedBox(width: 8),
                        Text("Recharger", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title, String action, {VoidCallback? onTap}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1A1C1E))),
        GestureDetector(
          onTap: onTap,
          child: Text(action, style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600)),
        ),
      ],
    );
  }

  Widget _buildPendingTPList(String filiere, List<Map<String, dynamic>> payments) {
    final tps = getTPsForFiliere(filiere);

    return SizedBox(
      height: 180,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: tps.length,
        itemBuilder: (context, index) {
          final tp = tps[index];
          final isPaid = payments.any((p) => p['tpCode'] == tp.code && p['verified'] == true);
          final paidTxId = isPaid ? payments.firstWhere((p) => p['tpCode'] == tp.code)['transactionId'] : null;

          return _buildTPCard(
            context, tp.title, tp.code, tp.price, tp.color, tp.icon, isPaid, paidTxId
          );
        },
      ),
    );
  }

  Widget _buildTPCard(
    BuildContext context,
    String title,
    String code,
    String price,
    Color color,
    IconData icon,
    bool isPaid,
    String? paidTxId,
  ) {
    return GestureDetector(
      onTap: () {
        if (isPaid && paidTxId != null) {
          context.push(
            '/qr-code',
            extra: {
              'title': title,
              'code': code,
              'price': price,
              'transactionId': paidTxId,
            },
          );
        } else {
          context.push('/payment');
        }
      },
      child: Container(
        width: 160,
        margin: const EdgeInsets.only(right: 16),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [BoxShadow(color: color.withValues(alpha: 0.1), blurRadius: 20, offset: const Offset(0, 10))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
               children: [
                 Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(color: color.withValues(alpha: 0.1), shape: BoxShape.circle),
                  child: Icon(icon, color: color, size: 20),
                ),
                if (isPaid)
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(color: Color(0xFFD4F7E0), shape: BoxShape.circle),
                    child: const Icon(LucideIcons.check, color: AppColors.success, size: 12),
                  ),
               ],
             ),
            const Spacer(),
            Text(code, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14), maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 8),
            if (isPaid)
              const Text(
                "Payé",
                style: TextStyle(color: AppColors.success, fontSize: 13, fontWeight: FontWeight.bold),
              )
            else
              Text(price, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
          ],
        ),
      ),
    );
  }

  Widget _buildActionCards(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Container(
            height: 170,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF0056D2), Color(0xFF003D99)],
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.15),
                  blurRadius: 10,
                  offset: const Offset(0, 5),
                )
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                CircleAvatar(
                  backgroundColor: Colors.white.withValues(alpha: 0.2),
                  child: const Icon(LucideIcons.wallet, color: Colors.white, size: 20),
                ),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Payer TP", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                    SizedBox(height: 4),
                    Text("Règlement rapide", style: TextStyle(color: Colors.white70, fontSize: 11)),
                  ],
                ),
                SizedBox(
                  width: double.infinity,
                  height: 38,
                  child: ElevatedButton(
                    onPressed: () => context.push('/payment'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AppColors.primary,
                      elevation: 0,
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text("Payer", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Container(
            height: 170,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF0D9488), Color(0xFF0F766E)],
              ),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.teal.withValues(alpha: 0.15),
                  blurRadius: 10,
                  offset: const Offset(0, 5),
                )
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                CircleAvatar(
                  backgroundColor: Colors.white.withValues(alpha: 0.2),
                  child: const Icon(LucideIcons.wand2, color: Colors.white, size: 20),
                ),
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Scanner IA", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                    SizedBox(height: 4),
                    Text("Vérifier quittance", style: TextStyle(color: Colors.white70, fontSize: 11)),
                  ],
                ),
                SizedBox(
                  width: double.infinity,
                  height: 38,
                  child: ElevatedButton(
                    onPressed: () => context.push('/scan-receipt'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF0F766E),
                      elevation: 0,
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text("Scanner", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRecentActivities(List<Map<String, dynamic>> payments) {
    if (payments.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
        child: const Center(
          child: Text(
            "Aucune activité récente.",
            style: TextStyle(color: AppColors.textLight, fontSize: 14),
          ),
        ),
      );
    }

    return Column(
      children: payments.take(3).map((payment) {
        final isDirect = payment['type'] == 'payment_direct';
        final timestamp = payment['timestamp'];
        
        String dateStr = "Aujourd'hui";
        if (timestamp is Timestamp) {
          final date = timestamp.toDate();
          dateStr = "${date.day}/${date.month}";
        }

        return Padding(
          padding: const EdgeInsets.only(bottom: 12.0),
          child: _buildActivityRow(
            payment['tpTitle'] ?? 'TP Validé',
            dateStr,
            "- ${payment['amount'] ?? '0 FCFA'}",
            isDirect ? AppColors.primary : AppColors.success,
          ),
        );
      }).toList(),
    );
  }

  Widget _buildActivityRow(String title, String date, String amount, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          CircleAvatar(backgroundColor: color.withValues(alpha: 0.1), child: Icon(LucideIcons.check, color: color, size: 16)),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                Text(date, style: const TextStyle(color: AppColors.textLight, fontSize: 12)),
              ],
            ),
          ),
          Text(amount, style: TextStyle(fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }
}
