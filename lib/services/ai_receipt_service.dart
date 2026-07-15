import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart' show XFile;

class AIReceiptService {
  // URL de votre Cloudflare Worker déployé
  static const String _apiEndpoint = "https://unipay-receipt-ai.angehlekpe664.workers.dev/";

  /// Envoie l'image ou le PDF du reçu au Cloudflare Worker pour analyse et validation.
  /// Si l'endpoint n'est pas configuré ou s'il y a un problème de réseau,
  /// retombe automatiquement sur une simulation locale intelligente pour les tests.
  Future<Map<String, dynamic>> verifyReceipt(XFile file, {String studentName = ""}) async {
    try {
      // Si l'utilisateur n'a pas encore configuré l'URL du Worker en production, on utilise la simulation locale
      if (_apiEndpoint.contains("your-api-endpoint")) {
        return await _simulateAIVerification(file, studentName: studentName);
      }

      final uri = Uri.parse(_apiEndpoint);
      final request = http.MultipartRequest('POST', uri);

      // Ajouter le fichier (Image ou PDF) de manière compatible Web & Mobile
      if (kIsWeb) {
        final bytes = await file.readAsBytes();
        request.files.add(
          http.MultipartFile.fromBytes(
            'receipt',
            bytes,
            filename: file.name,
          ),
        );
      } else {
        request.files.add(
          await http.MultipartFile.fromPath(
            'receipt',
            file.path,
          ),
        );
      }

      // Ajouter le nom de l'étudiant connecté pour la vérification anti-fraude d'identité
      if (studentName.isNotEmpty) {
        request.fields['studentName'] = studentName;
      }

      // Envoi de la requête
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = json.decode(response.body);
        return data;
      } else {
        try {
          final Map<String, dynamic> data = json.decode(response.body);
          if (data.containsKey('message') || data.containsKey('error')) {
            return {
              "verified": false,
              "message": data['message'] ?? data['error'],
              "data": data['data']
            };
          }
        } catch (_) {}
        throw Exception("Erreur de l'API (${response.statusCode}): ${response.reasonPhrase}");
      }
    } catch (e) {
      debugPrint("GCP API Verification failed: $e");
      if (kDebugMode) {
        return await _simulateAIVerification(file, studentName: studentName);
      }
      rethrow;
    }
  }

  /// Simule de façon intelligente l'analyse d'un reçu par une IA de vision
  /// avec une latence réaliste (3 secondes) et des résultats plausibles.
  Future<Map<String, dynamic>> _simulateAIVerification(XFile file, {String studentName = ""}) async {
    await Future.delayed(const Duration(seconds: 3));

    // Simulation de données basées sur un reçu de TP classique
    final filename = file.name.toLowerCase();
    
    // Si l'image sélectionnée contient "fail" ou "error", on peut simuler un échec pour tester
    if (filename.contains('fail') || filename.contains('erreur') || filename.contains('invalid')) {
      return {
        "status": "error",
        "verified": false,
        "confidence": 0.32,
        "message": "Le reçu est illisible ou ne correspond pas à un format de paiement valide. Veuillez reprendre une photo claire.",
        "data": null
      };
    }

    // Sinon, simulation d'une réussite avec de fausses informations réalistes
    final randomId = DateTime.now().millisecondsSinceEpoch.toString().substring(6);
    return {
      "status": "success",
      "verified": true,
      "confidence": 0.96,
      "message": "Reçu analysé et validé avec succès par l'IA.",
      "data": {
        "transactionId": "TP-AI-$randomId",
        "amount": "2.500 FCFA",
        "date": "Aujourd'hui",
        "tpTitle": "TP Chimie Organique (CHM-201)",
        "tpCode": "CHM-201",
        "student": studentName.isNotEmpty ? studentName : "Ange HLEKPE",
      }
    };
  }
}
