import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fastnew/core/theme/app_colors.dart';
import 'package:fastnew/providers/auth_provider.dart';
import 'package:go_router/go_router.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  // 'all' | 'payment_direct' | 'payment_scan'
  String _selectedFilter = 'all';

  String _formatTimestamp(dynamic timestamp) {
    if (timestamp == null) return "À l'instant";
    if (timestamp is Timestamp) {
      final date = timestamp.toDate();
      final months = [
        "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
        "Juil", "Août", "Sept", "Oct", "Nov", "Déc"
      ];
      final day = date.day.toString().padLeft(2, '0');
      final month = months[date.month - 1];
      final year = date.year;
      final hour = date.hour.toString().padLeft(2, '0');
      final minute = date.minute.toString().padLeft(2, '0');
      return "$day $month $year • $hour:$minute";
    }
    return timestamp.toString();
  }

  List<Map<String, dynamic>> _filterPayments(List<Map<String, dynamic>> all) {
    if (_selectedFilter == 'all') return all;
    return all.where((p) => p['type'] == _selectedFilter).toList();
  }

  @override
  Widget build(BuildContext context) {
    final paymentsAsync = ref.watch(userPaymentsProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFF),
      body: CustomScrollView(
        slivers: [
          _buildSliverAppBar(),
          SliverPadding(
            padding: const EdgeInsets.all(20),
            sliver: paymentsAsync.when(
              data: (allPayments) {
                final payments = _filterPayments(allPayments);

                return SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      if (index == 0) {
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _buildFilterChips(allPayments),
                            const SizedBox(height: 24),
                            _buildTransactionGroup(
                              payments.isEmpty
                                  ? "Aucune transaction"
                                  : "${payments.length} transaction(s)",
                            ),
                          ],
                        );
                      }

                      if (payments.isEmpty) {
                        return _buildEmptyState();
                      }

                      final payment = payments[index - 1];
                      final isDirect = payment['type'] == 'payment_direct';

                      return _buildTransactionItem(
                        context: context,
                        icon: isDirect ? LucideIcons.wallet : LucideIcons.fileCheck,
                        title: payment['tpTitle'] ?? 'TP Validé',
                        subtitle: _formatTimestamp(payment['timestamp']),
                        amount: payment['amount'] ?? '0 FCFA',
                        isDirect: isDirect,
                        tpCode: payment['tpCode'] ?? '',
                        transactionId: payment['transactionId'] ?? '',
                      );
                    },
                    childCount: payments.isEmpty ? 2 : payments.length + 1,
                  ),
                );
              },
              loading: () => const SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
              ),
              error: (err, stack) => SliverFillRemaining(
                hasScrollBody: false,
                child: Center(child: Text("Erreur de chargement : $err")),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSliverAppBar() {
    return SliverAppBar(
      expandedHeight: 120.0,
      floating: false,
      pinned: true,
      elevation: 0,
      backgroundColor: AppColors.primary,
      flexibleSpace: FlexibleSpaceBar(
        title: const Text(
          "Historique",
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20),
        ),
        centerTitle: false,
        titlePadding: const EdgeInsets.only(left: 20, bottom: 16),
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF0056D2), Color(0xFF003D99)],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChips(List<Map<String, dynamic>> allPayments) {
    final directCount = allPayments.where((p) => p['type'] == 'payment_direct').length;
    final scanCount = allPayments.where((p) => p['type'] == 'payment_scan').length;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _buildChip('all', 'Tout (${allPayments.length})'),
          _buildChip('payment_direct', 'Paiements ($directCount)'),
          _buildChip('payment_scan', 'Scanner IA ($scanCount)'),
        ],
      ),
    ).animate().fadeIn(delay: 200.ms).slideX();
  }

  Widget _buildChip(String value, String label) {
    final isSelected = _selectedFilter == value;
    return GestureDetector(
      onTap: () => setState(() => _selectedFilter = value),
      child: AnimatedContainer(
        duration: 200.ms,
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? AppColors.primary : Colors.grey[200]!),
          boxShadow: isSelected
              ? [BoxShadow(color: AppColors.primary.withValues(alpha: 0.3), blurRadius: 10)]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.black87,
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _buildTransactionGroup(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: AppColors.textLight,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const SizedBox(height: 60),
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.05),
            shape: BoxShape.circle,
          ),
          child: const Icon(LucideIcons.fileX, color: AppColors.primary, size: 50),
        ),
        const SizedBox(height: 24),
        const Text(
          "Aucune transaction",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 8),
        const Text(
          "Vous n'avez effectué aucun paiement\nni enregistré de quittance pour le moment.",
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
        ),
        const SizedBox(height: 32),
      ],
    ).animate().fadeIn(duration: 400.ms);
  }

  Widget _buildTransactionItem({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required String amount,
    required bool isDirect,
    required String tpCode,
    required String transactionId,
  }) {
    final color = isDirect ? AppColors.primary : AppColors.success;
    return GestureDetector(
      onTap: () => context.push('/qr-code', extra: {
        'title': title,
        'code': tpCode,
        'price': amount,
        'transactionId': transactionId,
      }),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.02),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(
                        isDirect ? LucideIcons.creditCard : LucideIcons.wand2,
                        size: 11,
                        color: AppColors.textLight,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isDirect ? "Paiement direct" : "Quittance IA",
                        style: const TextStyle(color: AppColors.textLight, fontSize: 11),
                      ),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          subtitle,
                          style: const TextStyle(color: AppColors.textLight, fontSize: 11),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  "- $amount",
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: color,
                    fontSize: 14,
                  ),
                ),
                const SizedBox(height: 4),
                const Icon(LucideIcons.chevronRight, size: 14, color: AppColors.textLight),
              ],
            ),
          ],
        ),
      ),
    ).animate().fadeIn(delay: 100.ms).slideY(begin: 0.1);
  }
}
