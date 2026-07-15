import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fastnew/core/theme/app_colors.dart';

class ReceiptScreen extends StatelessWidget {
  final String tpTitle;
  final String tpCode;
  final String tpPrice;
  final String? transactionId;

  const ReceiptScreen({
    super.key,
    required this.tpTitle,
    required this.tpCode,
    required this.tpPrice,
    this.transactionId,
  });

  @override
  Widget build(BuildContext context) {
    final double width = MediaQuery.of(context).size.width;
    final bool isDesktop = width >= 900;

    Widget content = SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              color: AppColors.success,
              shape: BoxShape.circle,
            ),
            child: const Icon(LucideIcons.check, color: Colors.white, size: 40),
          ),
          const SizedBox(height: 24),
          const Text(
            "Paiement Réussi",
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            "Votre quittance a été générée avec succès.",
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 40),
          _buildReceiptCard(context),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Row(
                    children: [
                      Icon(LucideIcons.fileText, color: Colors.white),
                      SizedBox(width: 12),
                      Text("Téléchargement du reçu PDF en cours..."),
                    ],
                  ),
                  backgroundColor: AppColors.primary,
                  duration: Duration(seconds: 2),
                ),
              );
            },
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(LucideIcons.fileText, size: 20),
                SizedBox(width: 12),
                Text("Télécharger en PDF"),
              ],
            ),
          ),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: () => context.push(
              '/qr-code',
              extra: {
                'title': tpTitle,
                'code': tpCode,
                'price': tpPrice,
                'transactionId': transactionId ?? 'TP-2023-8842',
              },
            ),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(double.infinity, 56),
              side: const BorderSide(color: AppColors.primary),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(LucideIcons.qrCode, size: 20, color: AppColors.primary),
                SizedBox(width: 12),
                Text(
                  "Afficher le QR Code",
                  style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          const SizedBox(height: 40),
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(LucideIcons.shieldCheck, color: AppColors.textLight, size: 16),
              SizedBox(width: 8),
              Text(
                "PAIEMENT SÉCURISÉ UNIPAY",
                style: TextStyle(
                  color: AppColors.textLight,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            "Cette quittance est un document officiel certifié par\nl'administration universitaire.",
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textLight, fontSize: 11),
          ),
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
          icon: const Icon(LucideIcons.x, color: AppColors.primary),
          onPressed: () => context.go('/'),
        ),
        title: const Text(
          "UniPay TP",
          style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
        ),
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

  Widget _buildReceiptCard(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
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
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "TRANSACTION ID",
                          style: TextStyle(color: AppColors.textLight, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          transactionId ?? "#TP-2023-8842",
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE7EEFA),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        "PAYÉ",
                        style: TextStyle(
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const Divider(color: AppColors.border, height: 1),
                const SizedBox(height: 24),
                _buildReceiptRow("Date", "Aujourd'hui, ${TimeOfDay.now().format(context)}"),
                const SizedBox(height: 16),
                _buildReceiptRow("Matière", tpTitle),
                const SizedBox(height: 16),
                _buildReceiptRow("Code", tpCode),
                const SizedBox(height: 16),
                _buildReceiptRow("Session", "Session TP de test"),
              ],
            ),
          ),
          Container(
            height: 1,
            width: double.infinity,
            decoration: const BoxDecoration(
              image: DecorationImage(
                image: NetworkImage("https://www.transparenttextures.com/patterns/pinstripe-dark.png"),
                repeat: ImageRepeat.repeatX,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const Text(
                  "Montant total réglé",
                  style: TextStyle(color: AppColors.textLight, fontSize: 13),
                ),
                const SizedBox(height: 8),
                Text(
                  tpPrice,
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReceiptRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
        ),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
      ],
    );
  }
}
