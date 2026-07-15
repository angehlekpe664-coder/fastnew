import 'package:cloud_firestore/cloud_firestore.dart';

/// Service utilitaire centralisé pour créer des notifications Firestore
/// dans la sous-collection /users/{uid}/notifications
class NotificationService {
  static const _paymentType = 'payment';
  static const _aiScanType = 'ai_scan';
  static const _welcomeType = 'welcome';
  static const _successType = 'success';

  /// Ajoute une notification dans Firestore pour l'utilisateur [uid].
  static Future<void> addNotification({
    required String uid,
    required String type,
    required String title,
    required String message,
  }) async {
    if (uid.isEmpty) return;
    await FirebaseFirestore.instance
        .collection('users')
        .doc(uid)
        .collection('notifications')
        .add({
      'type': type,
      'title': title,
      'message': message,
      'read': false,
      'timestamp': FieldValue.serverTimestamp(),
    });
  }

  /// Notification de bienvenue à l'inscription
  static Future<void> sendWelcomeNotification(String uid, String prenom) async {
    await addNotification(
      uid: uid,
      type: _welcomeType,
      title: "Bienvenue sur UniPay TP, $prenom ! 🎓",
      message:
          "Votre compte étudiant a été créé avec succès. Vous pouvez maintenant payer vos TPs et scanner vos quittances de paiement.",
    );
  }

  /// Notification lors d'un paiement direct réussi
  static Future<void> sendPaymentSuccessNotification({
    required String uid,
    required String tpTitle,
    required String amount,
    required String transactionId,
  }) async {
    await addNotification(
      uid: uid,
      type: _paymentType,
      title: "Paiement confirmé ✔",
      message:
          "Votre paiement de $amount pour « $tpTitle » a été enregistré avec succès. Réf : $transactionId",
    );
  }

  /// Notification lors de la validation d'une quittance par l'IA
  static Future<void> sendAIScanSuccessNotification({
    required String uid,
    required String tpTitle,
    required String amount,
    required String transactionId,
  }) async {
    await addNotification(
      uid: uid,
      type: _aiScanType,
      title: "Quittance validée par l'IA 🤖",
      message:
          "Votre quittance de $amount pour « $tpTitle » a été certifiée et enregistrée dans votre historique. Réf : $transactionId",
    );
  }

  /// Notification générique de succès
  static Future<void> sendGenericSuccess(String uid, String title, String message) async {
    await addNotification(uid: uid, type: _successType, title: title, message: message);
  }
}
