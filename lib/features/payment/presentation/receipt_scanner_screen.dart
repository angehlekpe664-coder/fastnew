import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fastnew/core/theme/app_colors.dart';
import 'package:fastnew/services/ai_receipt_service.dart';
import 'package:fastnew/providers/auth_provider.dart';
import 'package:fastnew/services/notification_service.dart';

class ReceiptScannerScreen extends ConsumerStatefulWidget {
  const ReceiptScannerScreen({super.key});

  @override
  ConsumerState<ReceiptScannerScreen> createState() => _ReceiptScannerScreenState();
}

class _ReceiptScannerScreenState extends ConsumerState<ReceiptScannerScreen> {
  final ImagePicker _picker = ImagePicker();
  final AIReceiptService _aiService = AIReceiptService();

  XFile? _selectedFile;
  String _fileSizeString = "";
  bool _isPdf = false;
  bool _isAnalyzing = false;
  int _analysisStep = 0;
  Map<String, dynamic>? _analysisResult;
  String? _errorMessage;

  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? image = await _picker.pickImage(
        source: source,
        imageQuality: 85,
      );
      if (image != null) {
        final length = await image.length();
        setState(() {
          _selectedFile = image;
          _fileSizeString = "${(length / (1024 * 1024)).toStringAsFixed(2)} Mo";
          _isPdf = false;
          _analysisResult = null;
          _errorMessage = null;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = "Impossible d'accéder à l'appareil photo/galerie : $e";
      });
    }
  }

  Future<void> _pickPDF() async {
    try {
      final FilePickerResult? result = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
      );
      if (result != null && result.files.single != null) {
        final platformFile = result.files.single;
        setState(() {
          if (kIsWeb) {
            _selectedFile = XFile.fromData(
              platformFile.bytes!,
              name: platformFile.name,
              length: platformFile.size,
            );
          } else {
            _selectedFile = XFile(platformFile.path!);
          }
          _fileSizeString = "${(platformFile.size / (1024 * 1024)).toStringAsFixed(2)} Mo";
          _isPdf = true;
          _analysisResult = null;
          _errorMessage = null;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = "Impossible de sélectionner le fichier PDF : $e";
      });
    }
  }

  Future<void> _runAIVerification() async {
    if (_selectedFile == null) return;

    // Récupérer le nom de l'étudiant connecté pour la vérification anti-fraude d'identité
    final userData = ref.read(userDataProvider).value;
    final String studentName = userData != null
        ? "${userData['prenom'] ?? ''} ${userData['nom'] ?? ''}".trim()
        : "";

    setState(() {
      _isAnalyzing = true;
      _analysisStep = 0;
      _analysisResult = null;
      _errorMessage = null;
    });

    // Progression des étapes de l'IA pour l'immersion utilisateur
    _incrementStep(1, const Duration(milliseconds: 900));
    _incrementStep(2, const Duration(milliseconds: 1800));

    try {
      final result = await _aiService.verifyReceipt(
        _selectedFile!,
        studentName: studentName,
      );
      
      if (mounted) {
        if (result['verified'] == true) {
          final data = result['data'] ?? {};
          final String transactionId = data['transactionId'] ?? '';
          
          if (transactionId.isNotEmpty) {
            // Check uniqueness in Firestore
            final doc = await FirebaseFirestore.instance
                .collection('verified_receipts')
                .doc(transactionId)
                .get();
                
            if (doc.exists) {
              setState(() {
                _isAnalyzing = false;
                _errorMessage = "Fraude détectée : Cette quittance de paiement (ID: $transactionId) a déjà été utilisée pour valider un TP !";
                _analysisResult = null;
              });
              return;
            }
          }
          
          setState(() {
            _isAnalyzing = false;
            _analysisResult = result;
            _errorMessage = null;
          });
        } else {
          setState(() {
            _isAnalyzing = false;
            _errorMessage = result['message'] ?? "Le reçu n'a pas pu être validé par l'IA.";
            _analysisResult = null;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isAnalyzing = false;
          _errorMessage = "Erreur de connexion ou d'analyse : ${e.toString()}";
          _analysisResult = null;
        });
      }
    }
  }

  void _incrementStep(int targetStep, Duration delay) {
    Future.delayed(delay, () {
      if (mounted && _isAnalyzing && _analysisStep < targetStep) {
        setState(() {
          _analysisStep = targetStep;
        });
      }
    });
  }

  void _resetScanner() {
    setState(() {
      _selectedFile = null;
      _fileSizeString = "";
      _isPdf = false;
      _isAnalyzing = false;
      _analysisStep = 0;
      _analysisResult = null;
      _errorMessage = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final double width = MediaQuery.of(context).size.width;
    final bool isDesktop = width >= 900;

    Widget content = SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!_isAnalyzing && _analysisResult == null && _errorMessage == null)
              _buildUploadForm(),
            if (_isAnalyzing)
              _buildLoadingState(),
            if (!_isAnalyzing && _analysisResult != null)
              _buildSuccessState(),
            if (!_isAnalyzing && _errorMessage != null)
              _buildErrorState(),
          ],
        ),
      ),
    );

    if (isDesktop) {
      content = Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 650),
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
          "Vérificateur de Reçus IA",
          style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
      ),
      body: content,
    );
  }

  Widget _buildUploadForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "Scanner votre quittance",
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ).animate().fadeIn(duration: 400.ms),
        const SizedBox(height: 8),
        const Text(
          "Importez la photo, le fichier PDF ou capturez en direct votre reçu de paiement. L'IA validera automatiquement vos détails académiques.",
          style: TextStyle(fontSize: 14, color: AppColors.textSecondary),
        ).animate().fadeIn(delay: 100.ms),
        const SizedBox(height: 32),
        
        // Zone interactive de sélection
        GestureDetector(
          onTap: () => _showPickerBottomSheet(),
          child: Container(
            width: double.infinity,
            height: 280,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: _selectedFile != null ? AppColors.primary : Colors.grey[200]!,
                width: 2,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 10,
                  offset: const Offset(0, 5),
                )
              ],
            ),
            child: _selectedFile != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(22),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        if (_isPdf)
                          Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(LucideIcons.fileText, color: Colors.redAccent, size: 70),
                              const SizedBox(height: 16),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                                child: Text(
                                  _selectedFile!.name,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                _fileSizeString,
                                style: const TextStyle(fontSize: 12, color: AppColors.textLight),
                              ),
                            ],
                          )
                        else
                          FutureBuilder<Uint8List>(
                            future: _selectedFile!.readAsBytes(),
                            builder: (context, snapshot) {
                              if (snapshot.hasData) {
                                return Image.memory(snapshot.data!, fit: BoxFit.cover);
                              }
                              return const Center(child: CircularProgressIndicator());
                            },
                          ),
                        if (!_isPdf)
                          Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: [Colors.black.withValues(alpha: 0.1), Colors.black.withValues(alpha: 0.5)],
                              ),
                            ),
                          ),
                        Positioned(
                          bottom: 16,
                          right: 16,
                          child: CircleAvatar(
                            backgroundColor: Colors.white,
                            child: IconButton(
                              icon: const Icon(LucideIcons.trash2, color: Colors.redAccent),
                              onPressed: () => setState(() {
                                _selectedFile = null;
                                _isPdf = false;
                              }),
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.05),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(LucideIcons.fileText, color: AppColors.primary, size: 40),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        "Ajouter un reçu (Image ou PDF)",
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        "Fichiers acceptés: PDF, PNG, JPG (Max 5Mo)",
                        style: TextStyle(fontSize: 12, color: AppColors.textLight),
                      ),
                    ],
                  ),
          ).animate().scale(delay: 200.ms, curve: Curves.easeOutBack),
        ),
        const SizedBox(height: 40),

        if (_selectedFile != null) ...[
          SizedBox(
            width: double.infinity,
            height: 60,
            child: ElevatedButton.icon(
              onPressed: _runAIVerification,
              icon: const Icon(LucideIcons.wand2),
              label: const Text("Analyser avec l'IA", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ).animate().fadeIn().slideY(begin: 0.1),
          const SizedBox(height: 16),
        ],

        // Guide utilisateur
        _buildGuideSection().animate().fadeIn(delay: 400.ms),
      ],
    );
  }

  Widget _buildGuideSection() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey[100]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(LucideIcons.info, color: AppColors.primary, size: 20),
              SizedBox(width: 10),
              Text(
                "Conseils pour l'analyse IA",
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _buildGuideItem("Prenez la photo de face dans un endroit bien éclairé."),
          const SizedBox(height: 12),
          _buildGuideItem("Assurez-vous que l'ID de transaction et le montant soient nets."),
          const SizedBox(height: 12),
          _buildGuideItem("N'utilisez pas de reçus froissés ou raturés."),
        ],
      ),
    );
  }

  Widget _buildGuideItem(String text) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text("• ", style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.3),
          ),
        ),
      ],
    );
  }

  Widget _buildLoadingState() {
    String stepText = "Numérisation de l'image...";
    if (_analysisStep == 1) stepText = "Extraction des caractères et des données...";
    if (_analysisStep == 2) stepText = "Validation avec la base académique...";

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 60.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 140,
                  height: 140,
                  child: CircularProgressIndicator(
                    value: (_analysisStep + 1) / 3,
                    strokeWidth: 8,
                    backgroundColor: Colors.grey[200],
                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primary),
                  ),
                ),
                Container(
                  width: 100,
                  height: 100,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.05),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(LucideIcons.wand2, size: 40, color: AppColors.primary)
                      .animate(onPlay: (controller) => controller.repeat(reverse: true))
                      .scale(begin: const Offset(0.9, 0.9), end: const Offset(1.1, 1.1), duration: 1.seconds),
                ),
              ],
            ),
            const SizedBox(height: 40),
            const Text(
              "Analyse de la Quittance par l'IA",
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ).animate().fadeIn(),
            const SizedBox(height: 12),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 300),
              child: Text(
                stepText,
                key: ValueKey<int>(_analysisStep),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 14, color: AppColors.textSecondary),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSuccessState() {
    final data = _analysisResult?['data'] ?? {};
    final tpTitle = data['tpTitle'] ?? 'TP Validé';
    final amount = data['amount'] ?? '2.500 FCFA';
    final transactionId = data['transactionId'] ?? '#TP-AI-XXXX';
    final date = data['date'] ?? 'Aujourd\'hui';

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: AppColors.success,
            shape: BoxShape.circle,
          ),
          child: const Icon(LucideIcons.check, color: Colors.white, size: 40),
        ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack),
        const SizedBox(height: 24),
        const Text(
          "Validation Réussie",
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ).animate().fadeIn(),
        const SizedBox(height: 8),
        const Text(
          "L'IA a certifié la conformité de votre quittance de paiement.",
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textSecondary),
        ).animate().fadeIn(delay: 100.ms),
        const SizedBox(height: 32),
        
        // Fiche d'information extraite
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.grey[100]!),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 10,
                offset: const Offset(0, 5),
              )
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
                              "ID TRANSACTION EXTRAIT",
                              style: TextStyle(color: AppColors.textLight, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              transactionId,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFD4F7E0),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            "CERTIFIÉ",
                            style: TextStyle(
                              color: AppColors.success,
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
                    _buildReceiptRow("Date", date),
                    const SizedBox(height: 16),
                    _buildReceiptRow("TP Associé", tpTitle),
                    const SizedBox(height: 16),
                    _buildReceiptRow("Fiabilité IA", "${((_analysisResult?['confidence'] ?? 0.95) * 100).toInt()}%"),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 24),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.02),
                  borderRadius: const BorderRadius.vertical(bottom: Radius.circular(24)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Montant certifié", style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
                    Text(amount, style: const TextStyle(color: AppColors.primary, fontSize: 20, fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ],
          ),
        ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.1),
        const SizedBox(height: 40),
        
        SizedBox(
          width: double.infinity,
          height: 60,
          child: ElevatedButton(
            onPressed: () async {
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

              setState(() {
                _isAnalyzing = true;
                _analysisStep = 2; // "Validation avec la base académique..."
              });

              try {
                // 1. Enregistrer la transaction globalement pour bloquer les futurs doublons
                await FirebaseFirestore.instance
                    .collection('verified_receipts')
                    .doc(transactionId)
                    .set({
                  'userId': user.uid,
                  'tpCode': data['tpCode'] ?? '',
                  'tpTitle': tpTitle,
                  'studentName': data['student'] ?? '',
                  'amount': amount,
                  'verifiedAt': FieldValue.serverTimestamp(),
                });

                // 2. Enregistrer dans la sous-collection de l'étudiant
                await FirebaseFirestore.instance
                    .collection('users')
                    .doc(user.uid)
                    .collection('payments')
                    .doc(transactionId)
                    .set({
                  'transactionId': transactionId,
                  'amount': amount,
                  'date': date,
                  'tpTitle': tpTitle,
                  'tpCode': data['tpCode'] ?? '',
                  'student': data['student'] ?? '',
                  'verified': true,
                  'type': 'payment_scan',
                  'timestamp': FieldValue.serverTimestamp(),
                });

                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text("Quittance enregistrée avec succès dans votre historique !"),
                    backgroundColor: AppColors.success,
                  ),
                );

                // Envoyer une notification de validation IA
                await NotificationService.sendAIScanSuccessNotification(
                  uid: user.uid,
                  tpTitle: tpTitle,
                  amount: amount,
                  transactionId: transactionId,
                );

                if (!mounted) return;
                context.go('/');
              } catch (e) {
                if (mounted) {
                  setState(() {
                    _isAnalyzing = false;
                    _errorMessage = "Erreur lors de l'enregistrement : $e";
                  });
                }
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: const Text("Confirmer et Enregistrer", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ).animate().fadeIn(delay: 300.ms),
        const SizedBox(height: 16),
        OutlinedButton(
          onPressed: _resetScanner,
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(double.infinity, 60),
            side: const BorderSide(color: Color(0xFFDEE2E6)),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          child: const Text("Scanner un autre reçu", style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
        ).animate().fadeIn(delay: 400.ms),
      ],
    );
  }

  Widget _buildErrorState() {
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: const BoxDecoration(
            color: Colors.redAccent,
            shape: BoxShape.circle,
          ),
          child: const Icon(LucideIcons.x, color: Colors.white, size: 40),
        ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack),
        const SizedBox(height: 24),
        const Text(
          "Analyse Échouée",
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.redAccent),
        ).animate().fadeIn(),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.redAccent.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.redAccent.withValues(alpha: 0.2)),
          ),
          child: Text(
            _errorMessage ?? "Le reçu est invalide ou illisible. L'IA n'a pas pu identifier la signature numérique de validation.",
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.redAccent, fontSize: 14, height: 1.4),
          ),
        ).animate().fadeIn(delay: 100.ms),
        const SizedBox(height: 40),
        SizedBox(
          width: double.infinity,
          height: 60,
          child: ElevatedButton(
            onPressed: _resetScanner,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: const Text("Réessayer la capture", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          ),
        ).animate().fadeIn(delay: 200.ms),
        const SizedBox(height: 16),
        TextButton(
          onPressed: () => context.pop(),
          child: const Text("Retourner à l'accueil", style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
        ).animate().fadeIn(delay: 300.ms),
      ],
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
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
        ),
      ],
    );
  }

  void _showPickerBottomSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      constraints: const BoxConstraints(maxWidth: 600),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (BuildContext context) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  "Sélectionner la source",
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _buildPickerOption(
                      icon: LucideIcons.camera,
                      label: "Appareil",
                      onTap: () {
                        Navigator.pop(context);
                        _pickImage(ImageSource.camera);
                      },
                    ),
                    _buildPickerOption(
                      icon: LucideIcons.image,
                      label: "Galerie",
                      onTap: () {
                        Navigator.pop(context);
                        _pickImage(ImageSource.gallery);
                      },
                    ),
                    _buildPickerOption(
                      icon: LucideIcons.fileText,
                      label: "Fichier PDF",
                      onTap: () {
                        Navigator.pop(context);
                        _pickPDF();
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildPickerOption({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 70,
            height: 70,
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.05),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.primary, size: 28),
          ),
          const SizedBox(height: 10),
          Text(
            label,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
          ),
        ],
      ),
    );
  }
}
