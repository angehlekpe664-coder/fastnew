import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fastnew/core/theme/app_colors.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fastnew/providers/auth_provider.dart';

class VerificationScreen extends ConsumerWidget {
  final String tpTitle;
  final String tpCode;
  final String tpPrice;
  final String transactionId;

  const VerificationScreen({
    super.key,
    required this.tpTitle,
    required this.tpCode,
    required this.tpPrice,
    required this.transactionId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userDataAsync = ref.watch(userDataProvider);
    final String studentName = userDataAsync.when(
      data: (data) => "${data?['prenom'] ?? ''} ${data?['nom'] ?? ''}".trim(),
      loading: () => "Chargement...",
      error: (_, __) => "Étudiant",
    );
    final String displayName = studentName.isEmpty ? "Étudiant" : studentName;
    final double width = MediaQuery.of(context).size.width;
    final bool isDesktop = width >= 900;

    Widget content = SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Text(
            "Vérification du Paiement",
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            "Présentez ce code au contrôleur de TP",
            style: TextStyle(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 32),
          _buildQRCard(context, displayName),
          const SizedBox(height: 32),
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(LucideIcons.shieldCheck, color: AppColors.textLight, size: 18),
              SizedBox(width: 8),
              Text(
                "SYSTÈME UNIPAY SÉCURISÉ",
                style: TextStyle(
                  color: AppColors.textLight,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Row(
                          children: [
                            Icon(LucideIcons.download, color: Colors.white),
                            SizedBox(width: 12),
                            Text("Téléchargement du reçu PDF..."),
                          ],
                        ),
                        backgroundColor: AppColors.primary,
                        duration: Duration(seconds: 2),
                      ),
                    );
                  },
                  icon: const Icon(LucideIcons.download, size: 20),
                  label: const Text("Reçu PDF"),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    side: const BorderSide(color: Color(0xFFDEE2E6)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Row(
                          children: [
                            Icon(LucideIcons.share2, color: Colors.white),
                            SizedBox(width: 12),
                            Text("Partage en cours..."),
                          ],
                        ),
                        backgroundColor: AppColors.primary,
                        duration: Duration(seconds: 2),
                      ),
                    );
                  },
                  icon: const Icon(LucideIcons.share2, size: 20),
                  label: const Text("Partager"),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
            ],
          ),
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
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                )
              ],
              border: Border.all(color: Colors.grey[200]!),
            ),
            child: content,
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFF),
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(LucideIcons.chevronLeft, color: AppColors.primary),
          onPressed: () => context.pop(),
        ),
        title: const Text(
          "UniPay TP",
          style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.wallet, color: AppColors.primary),
            onPressed: () {},
          ),
        ],
      ),
      body: content,
    );
  }

  Widget _buildQRCard(BuildContext context, String displayName) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Align(
            alignment: Alignment.topRight,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFD4F7E0),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(LucideIcons.checkCircle2, color: AppColors.success, size: 16),
                  SizedBox(width: 6),
                  Text(
                    "Validé",
                    style: TextStyle(
                      color: AppColors.success,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.primary, width: 2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: QrImageView(
              data: transactionId,
              version: QrVersions.auto,
              size: 200.0,
              eyeStyle: const QrEyeStyle(
                eyeShape: QrEyeShape.square,
                color: AppColors.textPrimary,
              ),
              dataModuleStyle: const QrDataModuleStyle(
                dataModuleShape: QrDataModuleShape.square,
                color: AppColors.textPrimary,
              ),
            ),
          ),
          const SizedBox(height: 32),
          const Divider(color: AppColors.border),
          const SizedBox(height: 24),
          _buildInfoRow("ID TRANSACTION", "#$transactionId", isBold: true),
          const SizedBox(height: 16),
          _buildInfoRow("HORODATAGE", "Aujourd'hui, ${TimeOfDay.now().format(context)}"),
          const SizedBox(height: 16),
          _buildInfoRow("ÉTUDIANT", displayName),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(color: AppColors.textLight, fontSize: 13, fontWeight: FontWeight.w500),
        ),
        Text(
          value,
          style: TextStyle(
            fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
            fontSize: 14,
            color: AppColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
