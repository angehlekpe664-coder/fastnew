import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fastnew/core/theme/app_colors.dart';
import 'package:fastnew/providers/auth_provider.dart';
import 'package:fastnew/features/home/presentation/home_screen.dart';
import 'package:fastnew/services/notification_service.dart';


class PaymentScreen extends ConsumerStatefulWidget {
  const PaymentScreen({super.key});

  @override
  ConsumerState<PaymentScreen> createState() => _PaymentScreenState();
}

class _PaymentScreenState extends ConsumerState<PaymentScreen> {
  int _currentStep = 0;
  int _selectedTP = 0;
  int _selectedMethod = 0;
  bool _isPaying = false;

  @override
  Widget build(BuildContext context) {
    final userDataAsync = ref.watch(userDataProvider);
    final double width = MediaQuery.of(context).size.width;
    final bool isDesktop = width >= 900;

    return userDataAsync.when(
      loading: () => const Scaffold(
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      ),
      error: (error, stack) => Scaffold(
        body: Center(child: Text("Erreur de chargement des données: $error")),
      ),
      data: (userData) {
        final filiere = userData?['filiere'] ?? 'MIA';
        final tps = getTPsForFiliere(filiere);

        Widget bodyContent = Column(
          children: [
            _buildProgressIndicator(isDesktop: false).animate().fadeIn(),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_currentStep == 0) _buildDetailsStep(tps),
                    if (_currentStep == 1) _buildPaymentStep(),
                  ],
                ),
              ),
            ),
            _buildBottomAction(tps, isDesktop: false),
          ],
        );

        if (isDesktop) {
          bodyContent = Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 650),
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 40),
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
                child: Column(
                  children: [
                    _buildProgressIndicator(isDesktop: true).animate().fadeIn(),
                    Expanded(
                      child: Container(
                        color: const Color(0xFFF8FAFF),
                        child: SingleChildScrollView(
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (_currentStep == 0) _buildDetailsStep(tps),
                              if (_currentStep == 1) _buildPaymentStep(),
                            ],
                          ),
                        ),
                      ),
                    ),
                    _buildBottomAction(tps, isDesktop: true),
                  ],
                ),
              ),
            ),
          );
        }

        return Scaffold(
          backgroundColor: const Color(0xFFF8FAFF),
          appBar: AppBar(
            title: const Text("Paiement sécurisé", style: TextStyle(fontWeight: FontWeight.bold)),
            leading: IconButton(icon: const Icon(LucideIcons.chevronLeft), onPressed: () => context.pop()),
          ),
          body: bodyContent,
        );
      },
    );
  }

  Widget _buildProgressIndicator({required bool isDesktop}) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 40),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: isDesktop
            ? const BorderRadius.vertical(top: Radius.circular(24))
            : null,
        border: isDesktop
            ? Border(bottom: BorderSide(color: Colors.grey[200]!))
            : null,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _buildStepNode(0, "Détails", _currentStep >= 0),
          _buildStepLine(_currentStep >= 1),
          _buildStepNode(1, "Paiement", _currentStep >= 1),
          _buildStepLine(_currentStep >= 2),
          _buildStepNode(2, "Reçu", _currentStep >= 2),
        ],
      ),
    );
  }

  Widget _buildStepNode(int index, String label, bool isActive) {
    return Column(
      children: [
        CircleAvatar(
          radius: 12,
          backgroundColor: isActive ? AppColors.primary : Colors.grey[200],
          child: index < _currentStep 
            ? const Icon(LucideIcons.check, size: 12, color: Colors.white)
            : Text("${index + 1}", style: TextStyle(fontSize: 10, color: isActive ? Colors.white : Colors.grey)),
        ),
        const SizedBox(height: 4),
        Text(label, style: TextStyle(fontSize: 10, fontWeight: isActive ? FontWeight.bold : FontWeight.normal)),
      ],
    );
  }

  Widget _buildStepLine(bool isActive) {
    return Expanded(child: Container(height: 2, color: isActive ? AppColors.primary : Colors.grey[200]));
  }

  Widget _buildDetailsStep(List<TPModel> tps) {
    if (tps.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.symmetric(vertical: 40.0),
          child: Text("Aucun TP disponible pour votre filière actuellement.", style: TextStyle(color: AppColors.textLight)),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Sélectionnez votre TP", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 20),
        ...List.generate(tps.length, (index) {
          final tp = tps[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 12.0),
            child: _buildTPSelector(index, "TP N°${index + 1} : ${tp.title}", tp.code, tp.price),
          );
        }),
      ],
    ).animate().fadeIn().slideX();
  }

  Widget _buildTPSelector(int index, String title, String sub, String price) {
    bool isSelected = _selectedTP == index;
    return GestureDetector(
      onTap: () => setState(() => _selectedTP = index),
      child: AnimatedContainer(
        duration: 300.ms,
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? AppColors.primary : Colors.transparent, width: 2),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)],
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  Text(sub, style: const TextStyle(color: AppColors.textLight, fontSize: 12)),
                ],
              ),
            ),
            Text(price, style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("Mode de règlement", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(child: _buildMethodCard(0, LucideIcons.smartphone, "Mobile Money")),
            const SizedBox(width: 16),
            Expanded(child: _buildMethodCard(1, LucideIcons.creditCard, "Carte")),
          ],
        ),
        const SizedBox(height: 32),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(color: AppColors.primary.withValues(alpha: 0.05), borderRadius: BorderRadius.circular(20)),
          child: const Row(
            children: [
              Icon(LucideIcons.info, color: AppColors.primary),
              SizedBox(width: 16),
              Expanded(child: Text("Le reçu sera automatiquement généré et stocké dans votre historique.", style: TextStyle(fontSize: 12))),
            ],
          ),
        ),
      ],
    ).animate().fadeIn().slideX();
  }

  Widget _buildMethodCard(int index, IconData icon, String label) {
    bool isSelected = _selectedMethod == index;
    return GestureDetector(
      onTap: () => setState(() => _selectedMethod = index),
      child: AnimatedContainer(
        duration: 300.ms,
        padding: const EdgeInsets.symmetric(vertical: 24),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.primary : Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)],
        ),
        child: Column(
          children: [
            Icon(icon, color: isSelected ? Colors.white : AppColors.primary, size: 32),
            const SizedBox(height: 12),
            Text(label, style: TextStyle(color: isSelected ? Colors.white : Colors.black, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomAction(List<TPModel> tps, {required bool isDesktop}) {
    final selectedTp = tps.isNotEmpty && _selectedTP < tps.length ? tps[_selectedTP] : null;
    final priceStr = selectedTp?.price ?? "0 FCFA";

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: isDesktop
            ? const BorderRadius.vertical(bottom: Radius.circular(24))
            : const BorderRadius.vertical(top: Radius.circular(30)),
        border: isDesktop
            ? Border(top: BorderSide(color: Colors.grey[200]!))
            : null,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text("Total à payer", style: TextStyle(color: AppColors.textSecondary)),
              Text(priceStr, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primary)),
            ],
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 60,
            child: ElevatedButton(
              onPressed: (tps.isEmpty || _isPaying) ? null : () async {
                if (_currentStep < 1) {
                  setState(() => _currentStep++);
                } else {
                  if (selectedTp != null) {
                    await _executePayment(context, selectedTp);
                  }
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
              ),
              child: _isPaying
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                  )
                : Text(_currentStep == 0 ? "Continuer" : "Confirmer le paiement", 
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          ),
        ],
      ),
    );
  }

  int _parsePrice(String priceStr) {
    final clean = priceStr.replaceAll(RegExp(r'[^0-9]'), '');
    return int.tryParse(clean) ?? 0;
  }

  Future<void> _executePayment(BuildContext context, TPModel selectedTp) async {
    final user = ref.read(userProvider);
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Erreur : Aucun utilisateur connecté."),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    final userData = ref.read(userDataProvider).value;
    final int currentSolde = userData?['solde'] ?? 0;
    final int priceInt = _parsePrice(selectedTp.price);

    if (currentSolde < priceInt) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Row(
            children: [
              Icon(LucideIcons.alertTriangle, color: Colors.orangeAccent),
              SizedBox(width: 8),
              Text("Solde Insuffisant"),
            ],
          ),
          content: Text(
            "Votre solde actuel est de $currentSolde FCFA. Ce TP coûte $priceInt FCFA.\n\n"
            "Veuillez recharger votre solde ou utiliser le scanner de quittance pour soumettre un reçu payé en banque.",
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Fermer"),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                context.push('/scan-receipt');
              },
              style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
              child: const Text("Scanner une quittance"),
            ),
          ],
        ),
      );
      return;
    }

    setState(() => _isPaying = true);

    try {
      final userRef = FirebaseFirestore.instance.collection('users').doc(user.uid);
      final transactionId = "TP-PAY-${DateTime.now().millisecondsSinceEpoch}";
      final studentName = "${userData?['prenom'] ?? ''} ${userData?['nom'] ?? ''}".trim();

      // Run Firestore Transaction
      await FirebaseFirestore.instance.runTransaction((transaction) async {
        final freshSnapshot = await transaction.get(userRef);
        final freshSolde = freshSnapshot.data()?['solde'] ?? 0;
        
        if (freshSolde < priceInt) {
          throw Exception("Solde insuffisant (solde mis à jour)");
        }
        
        // Deduct balance
        transaction.update(userRef, {'solde': freshSolde - priceInt});
      });

      // Write to verified_receipts
      await FirebaseFirestore.instance
          .collection('verified_receipts')
          .doc(transactionId)
          .set({
        'userId': user.uid,
        'tpCode': selectedTp.code,
        'tpTitle': selectedTp.title,
        'studentName': studentName,
        'amount': selectedTp.price,
        'verifiedAt': FieldValue.serverTimestamp(),
      });

      // Write to payments history of the student
      await FirebaseFirestore.instance
          .collection('users')
          .doc(user.uid)
          .collection('payments')
          .doc(transactionId)
          .set({
        'transactionId': transactionId,
        'amount': selectedTp.price,
        'date': "Aujourd'hui",
        'tpTitle': selectedTp.title,
        'tpCode': selectedTp.code,
        'student': studentName,
        'verified': true,
        'type': 'payment_direct',
        'timestamp': FieldValue.serverTimestamp(),
      });

      // Envoyer une notification de paiement réussi
      await NotificationService.sendPaymentSuccessNotification(
        uid: user.uid,
        tpTitle: selectedTp.title,
        amount: selectedTp.price,
        transactionId: transactionId,
      );

      if (context.mounted) {
        setState(() => _isPaying = false);
        context.push(
          '/receipt',
          extra: {
            'title': selectedTp.title,
            'code': selectedTp.code,
            'price': selectedTp.price,
            'transactionId': transactionId,
          },
        );
      }
    } catch (e) {
      if (context.mounted) {
        setState(() => _isPaying = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Échec du paiement : ${e.toString()}"),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }
}
