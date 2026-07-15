import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import 'package:fastnew/core/theme/app_colors.dart';

import 'package:fastnew/providers/auth_provider.dart';

class AdminDashboard extends ConsumerStatefulWidget {
  const AdminDashboard({super.key});

  @override
  ConsumerState<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends ConsumerState<AdminDashboard> {
  final NumberFormat _currencyFormat = NumberFormat.currency(
    locale: 'fr_FR',
    symbol: 'FCFA',
    decimalDigits: 0,
  );

  String _searchQuery = "";

  /// Formate et additionne les montants de la collection verified_receipts.
  int _calculateTotal(List<QueryDocumentSnapshot> docs) {
    int total = 0;
    for (var doc in docs) {
      final amountRaw = doc.get('amount');
      if (amountRaw == null) continue;
      
      final amountStr = amountRaw.toString();
      // Extraire uniquement les chiffres (ex: "2.500 FCFA" -> 2500)
      final numericOnly = amountStr.replaceAll(RegExp(r'[^0-9]'), '');
      if (numericOnly.isNotEmpty) {
        total += int.tryParse(numericOnly) ?? 0;
      }
    }
    return total;
  }

  /// Détecte le nombre de doublons suspects (combinaison userId + tpCode identique)
  int _detectDuplicates(List<QueryDocumentSnapshot> receipts) {
    final Set<String> seen = {};
    int duplicatesCount = 0;
    for (var receipt in receipts) {
      final userId = receipt.get('userId');
      final tpCode = receipt.get('tpCode') ?? 'INCONNU';
      final key = "$userId-$tpCode";
      if (seen.contains(key)) {
        duplicatesCount++;
      } else {
        seen.add(key);
      }
    }
    return duplicatesCount;
  }

  /// Extrait le code de base de la filière (MIA, PC, CBG, ENT)
  String _getBaseFiliere(String fullFiliere) {
    final upper = fullFiliere.toUpperCase();
    if (upper.startsWith('MIA')) return 'MIA';
    if (upper.startsWith('PC')) return 'PC';
    if (upper.startsWith('CBG')) return 'CBG';
    if (upper.startsWith('ENT')) return 'ENT';
    return 'Autre';
  }

  /// Ouvre le scanner simulé de quittance
  void _openScanner(BuildContext context) {
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: "Dismiss",
      transitionDuration: const Duration(milliseconds: 300),
      pageBuilder: (context, anim1, anim2) {
        return _SimulatedScannerScreen();
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: StreamBuilder<QuerySnapshot>(
        stream: FirebaseFirestore.instance.collection('verified_receipts').snapshots(),
        builder: (context, receiptsSnapshot) {
          return StreamBuilder<QuerySnapshot>(
            stream: FirebaseFirestore.instance.collection('users').snapshots(),
            builder: (context, usersSnapshot) {
              if (receiptsSnapshot.connectionState == ConnectionState.waiting ||
                  usersSnapshot.connectionState == ConnectionState.waiting) {
                return const Scaffold(
                  body: Center(
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                );
              }

              final receipts = receiptsSnapshot.data?.docs ?? [];
              final users = usersSnapshot.data?.docs ?? [];

              // Calculer les statistiques globales
              final totalCollecte = _calculateTotal(receipts);
              final tpsValides = receipts.length;
              final totalEtudiants = users.length;

              // Calculer les statistiques par filière
              final Map<String, int> filiereCounts = {'MIA': 0, 'PC': 0, 'CBG': 0, 'ENT': 0, 'Autre': 0};
              final Map<String, int> filiereRevenue = {'MIA': 0, 'PC': 0, 'CBG': 0, 'ENT': 0, 'Autre': 0};
              
              // Inscriptions par TP dans chaque filière
              final Map<String, Map<String, Map<String, dynamic>>> tpStats = {
                'MIA': {},
                'PC': {},
                'CBG': {},
                'ENT': {},
                'Autre': {},
              };

              for (var receipt in receipts) {
                final userId = receipt.get('userId');
                final tpCode = receipt.get('tpCode') ?? 'INCONNU';
                final tpTitle = receipt.get('tpTitle') ?? 'TP';
                final amountRaw = receipt.get('amount') ?? '0 FCFA';

                // Extraire le montant numérique
                final numericOnly = amountRaw.toString().replaceAll(RegExp(r'[^0-9]'), '');
                final amountInt = int.tryParse(numericOnly) ?? 0;

                // Trouver la filière de l'étudiant
                final matchingDocs = users.where((u) => u.id == userId);
                final fullFiliere = matchingDocs.isNotEmpty
                    ? (matchingDocs.first.get('filiere') ?? 'MIA 1').toString()
                    : 'MIA 1';
                final baseFiliere = _getBaseFiliere(fullFiliere);

                // Incrémenter les compteurs de filière
                filiereCounts[baseFiliere] = (filiereCounts[baseFiliere] ?? 0) + 1;
                filiereRevenue[baseFiliere] = (filiereRevenue[baseFiliere] ?? 0) + amountInt;

                // Incrémenter les stats par TP
                if (!tpStats.containsKey(baseFiliere)) {
                  tpStats[baseFiliere] = {};
                }
                final tpMap = tpStats[baseFiliere]!;
                if (!tpMap.containsKey(tpCode)) {
                  tpMap[tpCode] = {
                    'title': tpTitle,
                    'count': 0,
                  };
                }
                tpMap[tpCode]!['count'] = (tpMap[tpCode]!['count'] as int) + 1;
              }

              return Scaffold(
                backgroundColor: const Color(0xFFF8FAFF),
                appBar: AppBar(
                  title: const Text(
                    "Administration UniPay",
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  elevation: 0,
                  backgroundColor: Colors.white,
                  foregroundColor: AppColors.textPrimary,
                  actions: [
                    IconButton(
                      icon: const Icon(LucideIcons.logOut),
                      tooltip: "Déconnexion",
                      onPressed: () async {
                        await ref.read(authServiceProvider).signOut();
                        if (context.mounted) {
                          context.go('/login');
                        }
                      },
                    ),
                  ],
                  bottom: const TabBar(
                    labelColor: AppColors.primary,
                    unselectedLabelColor: AppColors.textLight,
                    indicatorColor: AppColors.primary,
                    indicatorWeight: 3,
                    tabs: [
                      Tab(text: "Vue d'ensemble", icon: Icon(LucideIcons.layoutDashboard, size: 18)),
                      Tab(text: "Inscriptions TPs", icon: Icon(LucideIcons.graduationCap, size: 18)),
                      Tab(text: "Liste Étudiants", icon: Icon(LucideIcons.users, size: 18)),
                    ],
                  ),
                ),
                body: TabBarView(
                  children: [
                    _buildOverviewTab(context, receipts, totalCollecte, tpsValides, totalEtudiants, filiereCounts, filiereRevenue),
                    _buildTpStatsTab(context, tpStats),
                    _buildStudentsTab(context, users, receipts),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildOverviewTab(
    BuildContext context,
    List<QueryDocumentSnapshot> receipts,
    int totalCollecte,
    int tpsValides,
    int totalEtudiants,
    Map<String, int> filiereCounts,
    Map<String, int> filiereRevenue,
  ) {
    final int duplicatesCount = _detectDuplicates(receipts);
    final double width = MediaQuery.of(context).size.width;
    final bool isDesktop = width >= 900;

    Widget content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Grid stats
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: isDesktop ? 4 : 2,
          mainAxisSpacing: 16,
          crossAxisSpacing: 16,
          childAspectRatio: isDesktop ? 1.6 : 1.4,
          children: [
            _buildStatItem(
              "Total Collecté",
              _currencyFormat.format(totalCollecte).replaceAll("EUR", "FCFA"),
              LucideIcons.wallet,
              Colors.green,
            ).animate().scale(duration: 300.ms, curve: Curves.easeOutBack),
            _buildStatItem(
              "TPs Validés",
              tpsValides.toString(),
              LucideIcons.checkCircle,
              Colors.blue,
            ).animate().scale(delay: 50.ms, duration: 300.ms, curve: Curves.easeOutBack),
            _buildStatItem(
              "Étudiants",
              totalEtudiants.toString(),
              LucideIcons.users,
              Colors.orange,
            ).animate().scale(delay: 100.ms, duration: 300.ms, curve: Curves.easeOutBack),
            _buildStatItem(
              "Alertes Doublons",
              duplicatesCount.toString(),
              LucideIcons.alertTriangle,
              duplicatesCount > 0 ? Colors.red : Colors.green,
            ).animate().scale(delay: 150.ms, duration: 300.ms, curve: Curves.easeOutBack),
          ],
        ),
        
        const SizedBox(height: 32),
        const Text(
          "Répartition par Filière",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 16),
        _buildFiliereStatsCard(filiereCounts, tpsValides, filiereRevenue),

        const SizedBox(height: 32),
        const Text(
          "Actions Administrateur",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 16),
        InkWell(
          onTap: () => _openScanner(context),
          borderRadius: BorderRadius.circular(16),
          child: _buildActionCard(
            icon: LucideIcons.scanLine,
            title: "Vérifier une quittance",
            subtitle: "Saisir la référence ou scanner le reçu",
            color: AppColors.primary,
          ),
        ),
        const SizedBox(height: 16),
        _buildActionCard(
          icon: LucideIcons.copyCheck,
          title: "Détection de doublons",
          subtitle: duplicatesCount == 0
              ? "Aucune anomalie détectée automatiquement"
              : "$duplicatesCount doublons suspects détectés !",
          color: duplicatesCount > 0 ? Colors.red : AppColors.warning,
        ),
        
        const SizedBox(height: 32),
        const Text(
          "Dernières Transactions",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 16),
        _buildRecentTransactionsList(receipts),
      ],
    );

    if (isDesktop) {
      content = Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1100),
          child: content,
        ),
      );
    }

    return SingleChildScrollView(
      padding: EdgeInsets.all(isDesktop ? 40 : 20),
      child: content,
    );
  }

  Widget _buildStatItem(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 8),
          Text(
            value, 
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textPrimary),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(color: AppColors.textLight, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildActionCard({
    required IconData icon, 
    required String title, 
    required String subtitle, 
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            child: Icon(icon, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary)),
                const SizedBox(height: 2),
                Text(subtitle, style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
              ],
            ),
          ),
          Icon(LucideIcons.chevronRight, color: color),
        ],
      ),
    );
  }

  // ─── Filière Stats Card ────────────────────────────────────────────────────
  Widget _buildFiliereStatsCard(
    Map<String, int> counts,
    int total,
    Map<String, int> revenue,
  ) {
    final filieresConfig = [
      {'key': 'MIA', 'label': 'MIA', 'color': Colors.blue[600]!, 'icon': LucideIcons.cpu},
      {'key': 'PC', 'label': 'PC', 'color': Colors.purple[600]!, 'icon': LucideIcons.sun},
      {'key': 'CBG', 'label': 'CBG', 'color': Colors.green[600]!, 'icon': LucideIcons.leaf},
      {'key': 'ENT', 'label': 'ENT', 'color': Colors.orange[600]!, 'icon': LucideIcons.briefcase},
    ];

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border, width: 0.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: filieresConfig.map((cfg) {
          final key = cfg['key'] as String;
          final color = cfg['color'] as Color;
          final icon = cfg['icon'] as IconData;
          final label = cfg['label'] as String;
          final count = counts[key] ?? 0;
          final rev = revenue[key] ?? 0;
          final fraction = total > 0 ? count / total : 0.0;

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(icon, color: color, size: 20),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(label,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                      color: AppColors.textPrimary)),
                              Text(
                                "$count inscrit${count != 1 ? 's' : ''}",
                                style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: color,
                                    fontSize: 13),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: fraction.toDouble(),
                              backgroundColor: color.withValues(alpha: 0.1),
                              valueColor: AlwaysStoppedAnimation<Color>(color),
                              minHeight: 6,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            "${_currencyFormat.format(rev).replaceAll('EUR', 'FCFA')} collectés",
                            style: const TextStyle(color: AppColors.textLight, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (key != 'ENT')
                const Divider(height: 1, indent: 20, endIndent: 20, color: AppColors.border),
            ],
          );
        }).toList(),
      ),
    );
  }

  // ─── Recent Transactions List ──────────────────────────────────────────────
  Widget _buildRecentTransactionsList(List<QueryDocumentSnapshot> receipts) {
    final recent = receipts.take(5).toList();

    if (recent.isEmpty) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: const Center(
          child: Text(
            "Aucune transaction enregistrée.",
            style: TextStyle(color: AppColors.textLight),
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border, width: 0.5),
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: recent.length,
        separatorBuilder: (_, __) =>
            const Divider(height: 1, color: AppColors.border),
        itemBuilder: (context, index) {
          final doc = recent[index];
          final student = doc.get('studentName') ?? 'Étudiant';
          final tpTitle = doc.get('tpTitle') ?? doc.get('tpCode') ?? 'Frais de TP';
          final amount = doc.get('amount') ?? '0 FCFA';
          final verifiedAt = doc.get('verifiedAt');

          String timeStr = "";
          if (verifiedAt is Timestamp) {
            final date = verifiedAt.toDate();
            timeStr =
                "${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}";
          }

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                  child: const Icon(LucideIcons.user, size: 16, color: AppColors.primary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(student,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: AppColors.textPrimary)),
                      const SizedBox(height: 2),
                      Text("$tpTitle • $timeStr",
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.textLight)),
                    ],
                  ),
                ),
                Text(
                  amount,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                      fontSize: 14),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ─── Onglet 2 : Inscriptions TPs ──────────────────────────────────────────
  Widget _buildTpStatsTab(
    BuildContext context,
    Map<String, Map<String, Map<String, dynamic>>> tpStats,
  ) {
    final filieresOrder = ['MIA', 'PC', 'CBG', 'ENT'];
    final filiereColors = {
      'MIA': Colors.blue[600]!,
      'PC': Colors.purple[600]!,
      'CBG': Colors.green[600]!,
      'ENT': Colors.orange[600]!,
    };
    final double width = MediaQuery.of(context).size.width;
    final bool isDesktop = width >= 900;

    Widget content = Column(
      children: filieresOrder.map((filiere) {
        final color = filiereColors[filiere] ?? AppColors.primary;
        final tps = tpStats[filiere] ?? {};

        return Container(
          margin: const EdgeInsets.only(bottom: 20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: color.withValues(alpha: 0.25)),
            boxShadow: [
              BoxShadow(
                color: color.withValues(alpha: 0.06),
                blurRadius: 12,
                offset: const Offset(0, 4),
              )
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header de la filière
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.08),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: Row(
                  children: [
                    Icon(LucideIcons.graduationCap, color: color, size: 20),
                    const SizedBox(width: 10),
                    Text(
                      "Filière $filiere",
                      style: TextStyle(
                        color: color,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: color,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        "${tps.values.fold(0, (s, m) => s + (m['count'] as int))} total",
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
              // Liste des TPs
              if (tps.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(20),
                  child: Text(
                    "Aucune inscription enregistrée pour cette filière.",
                    style: TextStyle(color: AppColors.textLight, fontSize: 13),
                  ),
                )
              else
                ...tps.entries.map((entry) {
                  final code = entry.key;
                  final tpData = entry.value;
                  final title = tpData['title'] as String? ?? code;
                  final count = tpData['count'] as int? ?? 0;

                  return Column(
                    children: [
                      const Divider(height: 1, color: AppColors.border),
                      Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 20, vertical: 14),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(code,
                                  style: TextStyle(
                                      color: color,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold)),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(title,
                                  style: const TextStyle(
                                      fontSize: 13,
                                      color: AppColors.textPrimary)),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 5),
                              decoration: BoxDecoration(
                                color: count > 0
                                    ? color.withValues(alpha: 0.1)
                                    : Colors.grey[100]!,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                "$count inscrit${count != 1 ? 's' : ''}",
                                style: TextStyle(
                                    color:
                                        count > 0 ? color : AppColors.textLight,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  );
                }),
            ],
          ),
        ).animate().fadeIn(delay: (filieresOrder.indexOf(filiere) * 80).ms);
      }).toList(),
    );

    if (isDesktop) {
      content = Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1100),
          child: content,
        ),
      );
    }

    return ListView(
      padding: EdgeInsets.all(isDesktop ? 40 : 20),
      children: [content],
    );
  }

  // ─── Onglet 3 : Liste des Étudiants ───────────────────────────────────────
  Widget _buildStudentsTab(
    BuildContext context,
    List<QueryDocumentSnapshot> users,
    List<QueryDocumentSnapshot> receipts,
  ) {
    // Filtrer selon la recherche
    final filtered = users.where((u) {
      if (_searchQuery.isEmpty) return true;
      final data = u.data() as Map<String, dynamic>;
      final nom = (data['nom'] ?? '').toString().toLowerCase();
      final prenom = (data['prenom'] ?? '').toString().toLowerCase();
      final matricule = (data['matricule'] ?? '').toString().toLowerCase();
      final filiere = (data['filiere'] ?? '').toString().toLowerCase();
      final q = _searchQuery.toLowerCase();
      return nom.contains(q) ||
          prenom.contains(q) ||
          matricule.contains(q) ||
          filiere.contains(q);
    }).toList();

    // Map: userId -> nombre de TPs payés
    final Map<String, int> userTpCount = {};
    for (var r in receipts) {
      final uid = r.get('userId') as String?;
      if (uid != null) {
        userTpCount[uid] = (userTpCount[uid] ?? 0) + 1;
      }
    }

    final double width = MediaQuery.of(context).size.width;
    final bool isDesktop = width >= 900;

    Widget content = Column(
      children: [
        // Barre de recherche
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: TextField(
            onChanged: (v) => setState(() => _searchQuery = v),
            decoration: InputDecoration(
              hintText: "Rechercher par nom, matricule ou filière...",
              hintStyle: const TextStyle(fontSize: 13, color: AppColors.textLight),
              prefixIcon: const Icon(LucideIcons.search, size: 18, color: AppColors.primary),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(LucideIcons.x, size: 18, color: AppColors.textLight),
                      onPressed: () => setState(() => _searchQuery = ""),
                    )
                  : null,
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(vertical: 14),
              border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none),
              enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide(color: Colors.grey[200]!)),
              focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide:
                      BorderSide(color: AppColors.primary.withValues(alpha: 0.5))),
            ),
          ),
        ),
        // Résumé
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              "${filtered.length} étudiant${filtered.length != 1 ? 's' : ''} trouvé${filtered.length != 1 ? 's' : ''}",
              style: const TextStyle(
                  color: AppColors.textLight,
                  fontSize: 12,
                  fontWeight: FontWeight.w500),
            ),
          ),
        ),
        // Liste
        Expanded(
          child: filtered.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(LucideIcons.userX,
                          size: 48, color: AppColors.textLight),
                      const SizedBox(height: 12),
                      Text(
                        _searchQuery.isEmpty
                            ? "Aucun étudiant inscrit."
                            : "Aucun résultat pour \"$_searchQuery\".",
                        style: const TextStyle(
                            color: AppColors.textLight, fontSize: 14),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final data =
                        filtered[index].data() as Map<String, dynamic>;
                    final uid = filtered[index].id;
                    final nom = data['nom'] ?? '';
                    final prenom = data['prenom'] ?? '';
                    final matricule = data['matricule'] ?? 'N/A';
                    final filiere = data['filiere'] ?? 'Non renseignée';
                    final solde = data['solde'] ?? 0;
                    final tpCount = userTpCount[uid] ?? 0;
                    final isAdmin =
                        data['role'] == 'admin' || data['isAdmin'] == true;

                    final baseFiliere = _getBaseFiliere(filiere.toString());
                    final filiereColors = {
                      'MIA': Colors.blue[600]!,
                      'PC': Colors.purple[600]!,
                      'CBG': Colors.green[600]!,
                      'ENT': Colors.orange[600]!,
                    };
                    final color = filiereColors[baseFiliere] ?? Colors.grey;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.border, width: 0.5),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.02),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          )
                        ],
                      ),
                      child: Row(
                        children: [
                          // Avatar avec initiales
                          CircleAvatar(
                            backgroundColor: color.withValues(alpha: 0.12),
                            radius: 24,
                            child: Text(
                              nom.isNotEmpty ? nom[0].toUpperCase() : '?',
                              style: TextStyle(
                                color: color,
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        "$prenom $nom",
                                        style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 14,
                                            color: AppColors.textPrimary),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    if (isAdmin)
                                      Container(
                                        margin: const EdgeInsets.only(left: 6),
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: Colors.amber[100],
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: const Text("ADMIN",
                                            style: TextStyle(
                                                fontSize: 9,
                                                fontWeight: FontWeight.bold,
                                                color: Colors.amber)),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    const Icon(LucideIcons.hash,
                                        size: 12,
                                        color: AppColors.textLight),
                                    const SizedBox(width: 4),
                                    Text(matricule,
                                        style: const TextStyle(
                                            color: AppColors.textLight,
                                            fontSize: 12)),
                                    const SizedBox(width: 10),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 7, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: color.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(filiere.toString(),
                                          style: TextStyle(
                                              color: color,
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600)),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text("$solde FCFA",
                                  style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      color: AppColors.textPrimary)),
                              const SizedBox(height: 4),
                              Text("$tpCount TP${tpCount != 1 ? 's' : ''}",
                                  style: TextStyle(
                                      fontSize: 11,
                                      color: tpCount > 0
                                          ? Colors.green
                                          : AppColors.textLight,
                                      fontWeight: FontWeight.w500)),
                            ],
                          ),
                        ],
                      ),
                    ).animate().fadeIn(delay: (index * 30).ms);
                  },
                ),
        ),
      ],
    );

    if (isDesktop) {
      content = Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1100),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: content,
          ),
        ),
      );
    }

    return content;
  }
}

/// Écran de scan simulé
class _SimulatedScannerScreen extends StatefulWidget {
  @override
  State<_SimulatedScannerScreen> createState() => _SimulatedScannerScreenState();
}

class _SimulatedScannerScreenState extends State<_SimulatedScannerScreen> {
  final TextEditingController _refController = TextEditingController();
  bool _isValidating = false;
  Map<String, dynamic>? _resultData;
  String? _errorMessage;

  Future<void> _validateReceipt() async {
    final ref = _refController.text.trim();
    if (ref.isEmpty) return;

    setState(() {
      _isValidating = true;
      _resultData = null;
      _errorMessage = null;
    });

    try {
      final doc = await FirebaseFirestore.instance.collection('verified_receipts').doc(ref).get();
      if (doc.exists) {
        setState(() {
          _resultData = doc.data();
          _resultData?['ref'] = ref;
        });
      } else {
        setState(() {
          _errorMessage = "Cette référence de reçu n'existe pas dans la base de données académique. Risque de faux reçu ou fraude.";
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = "Erreur de connexion : ${e.toString()}";
      });
    } finally {
      setState(() => _isValidating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final double width = MediaQuery.of(context).size.width;
    final bool isDesktop = width >= 900;

    Widget content = SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Column(
        children: [
          const SizedBox(height: 20),
          
          // Scanner Viewport Simulator
          if (_resultData == null && _errorMessage == null)
            Container(
              height: 260,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white24, width: 2),
              ),
              child: Stack(
                children: [
                  // Corner borders overlay
                  _buildCorners(),
                  // Animated Laser line
                  Positioned(
                    left: 10,
                    right: 10,
                    child: Container(
                      height: 3,
                      decoration: BoxDecoration(
                        color: AppColors.primary,
                        boxShadow: [
                          BoxShadow(color: AppColors.primary.withValues(alpha: 0.8), blurRadius: 15, spreadRadius: 2),
                        ],
                      ),
                    ),
                  ).animate(onPlay: (controller) => controller.repeat(reverse: true))
                   .moveY(begin: 20, end: 240, duration: 2.seconds, curve: Curves.easeInOut),
                  const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(LucideIcons.qrCode, color: Colors.white38, size: 64),
                        SizedBox(height: 12),
                        Text("Simulateur de caméra de scan", style: TextStyle(color: Colors.white38, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

          // Success display
          if (_resultData != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.green.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.green.withValues(alpha: 0.4), width: 1.5),
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle),
                    child: const Icon(LucideIcons.check, color: Colors.white, size: 40),
                  ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack),
                  const SizedBox(height: 16),
                  const Text(
                    "QUITTANCE CERTIFIÉE",
                    style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 18, letterSpacing: 1.2),
                  ),
                  const SizedBox(height: 24),
                  _buildResultField("Référence", _resultData!['ref'] ?? ''),
                  _buildResultField("Étudiant", _resultData!['studentName'] ?? 'Non spécifié'),
                  _buildResultField("Code TP", _resultData!['tpCode'] ?? ''),
                  _buildResultField("Titre TP", _resultData!['tpTitle'] ?? 'Frais de TP'),
                  _buildResultField("Montant", _resultData!['amount'] ?? '0 FCFA'),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: () {
                        setState(() {
                          _resultData = null;
                          _refController.clear();
                        });
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text("Scanner un autre reçu", style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 300.ms),

          // Error display
          if (_errorMessage != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.red.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.red.withValues(alpha: 0.4), width: 1.5),
              ),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                    child: const Icon(LucideIcons.alertTriangle, color: Colors.white, size: 40),
                  ).animate().shake(duration: 500.ms),
                  const SizedBox(height: 16),
                  const Text(
                    "QUITTANCE INVALIDE",
                    style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 18, letterSpacing: 1.2),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _errorMessage!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.redAccent, fontSize: 13, height: 1.4),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: () {
                        setState(() {
                          _errorMessage = null;
                          _refController.clear();
                        });
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text("Réessayer", style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 300.ms),

          const SizedBox(height: 40),

          // Manual Saisie Fields
          if (_resultData == null && _errorMessage == null) ...[
            const Align(
              alignment: Alignment.centerLeft,
              child: Text(
                "Saisie Manuelle de la Référence",
                style: TextStyle(color: Colors.white70, fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _refController,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                hintText: "Ex: TP-PAY-16987654321 ou TP-AI-XXXX",
                hintStyle: const TextStyle(color: Colors.white30),
                filled: true,
                fillColor: Colors.white.withValues(alpha: 0.05),
                prefixIcon: const Icon(LucideIcons.hash, color: Colors.white54, size: 20),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Colors.white10)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.primary)),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton.icon(
                onPressed: _isValidating ? null : _validateReceipt,
                icon: _isValidating 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Icon(LucideIcons.checkSquare),
                label: Text(_isValidating ? "Validation..." : "Valider le Reçu", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ),
          ],
          const SizedBox(height: 40),
        ],
      ),
    );

    if (isDesktop) {
      content = Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: Container(
            margin: const EdgeInsets.symmetric(vertical: 40),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                )
              ],
              border: Border.all(color: Colors.white10),
            ),
            child: content,
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Style Scanner sombre
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(LucideIcons.x, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text("Vérification Quittance", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: content,
    );
  }

  Widget _buildResultField(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: const TextStyle(color: Colors.white38, fontSize: 13)),
          ),
          Expanded(
            child: Text(value, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }

  Widget _buildCorners() {
    return Stack(
      children: [
        // Top Left
        Positioned(
          top: 10,
          left: 10,
          child: Container(
            width: 24,
            height: 24,
            decoration: const BoxDecoration(
              border: Border(
                top: BorderSide(color: Colors.white60, width: 3),
                left: BorderSide(color: Colors.white60, width: 3),
              ),
            ),
          ),
        ),
        // Top Right
        Positioned(
          top: 10,
          right: 10,
          child: Container(
            width: 24,
            height: 24,
            decoration: const BoxDecoration(
              border: Border(
                top: BorderSide(color: Colors.white60, width: 3),
                right: BorderSide(color: Colors.white60, width: 3),
              ),
            ),
          ),
        ),
        // Bottom Left
        Positioned(
          bottom: 10,
          left: 10,
          child: Container(
            width: 24,
            height: 24,
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Colors.white60, width: 3),
                left: BorderSide(color: Colors.white60, width: 3),
              ),
            ),
          ),
        ),
        // Bottom Right
        Positioned(
          bottom: 10,
          right: 10,
          child: Container(
            width: 24,
            height: 24,
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Colors.white60, width: 3),
                right: BorderSide(color: Colors.white60, width: 3),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
