import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:fastnew/core/theme/app_colors.dart';
import 'package:fastnew/providers/auth_provider.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  String _formatTimestamp(dynamic timestamp) {
    if (timestamp == null) return "À l'instant";
    if (timestamp is Timestamp) {
      final date = timestamp.toDate();
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inMinutes < 1) return "À l'instant";
      if (diff.inMinutes < 60) return "Il y a ${diff.inMinutes} min";
      if (diff.inHours < 24) return "Il y a ${diff.inHours}h";
      if (diff.inDays == 1) return "Hier";
      if (diff.inDays < 7) return "Il y a ${diff.inDays} jours";

      final months = [
        "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
        "Juil", "Août", "Sept", "Oct", "Nov", "Déc"
      ];
      return "${date.day} ${months[date.month - 1]} ${date.year}";
    }
    return timestamp.toString();
  }

  Future<void> _markAsRead(BuildContext context, String uid, String notifId) async {
    await FirebaseFirestore.instance
        .collection('users')
        .doc(uid)
        .collection('notifications')
        .doc(notifId)
        .update({'read': true});
  }

  Future<void> _markAllAsRead(BuildContext context, String uid, List<Map<String, dynamic>> notifications) async {
    final batch = FirebaseFirestore.instance.batch();
    for (final notif in notifications) {
      if (notif['read'] != true) {
        final ref = FirebaseFirestore.instance
            .collection('users')
            .doc(uid)
            .collection('notifications')
            .doc(notif['id'] as String);
        batch.update(ref, {'read': true});
      }
    }
    await batch.commit();
  }

  Future<void> _deleteNotification(String uid, String notifId) async {
    await FirebaseFirestore.instance
        .collection('users')
        .doc(uid)
        .collection('notifications')
        .doc(notifId)
        .delete();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(userNotificationsProvider);
    final userAsync = ref.watch(userProvider);
    final uid = userAsync?.uid ?? '';

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFF),
      body: CustomScrollView(
        slivers: [
          _buildSliverAppBar(context, ref, uid, notificationsAsync),
          SliverPadding(
            padding: const EdgeInsets.all(20),
            sliver: notificationsAsync.when(
              data: (notifications) {
                if (notifications.isEmpty) {
                  return SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(child: _buildEmptyState()),
                  );
                }

                return SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final notif = notifications[index];
                      final isRead = notif['read'] == true;
                      final notifId = notif['id'] as String? ?? '';

                      return Dismissible(
                        key: Key(notifId),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: Colors.redAccent,
                            borderRadius: BorderRadius.circular(24),
                          ),
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 24),
                          child: const Icon(LucideIcons.trash2, color: Colors.white),
                        ),
                        onDismissed: (_) => _deleteNotification(uid, notifId),
                        child: _buildNotificationCard(
                          context: context,
                          notif: notif,
                          isRead: isRead,
                          uid: uid,
                          notifId: notifId,
                        ),
                      );
                    },
                    childCount: notifications.length,
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

  Widget _buildSliverAppBar(
    BuildContext context,
    WidgetRef ref,
    String uid,
    AsyncValue<List<Map<String, dynamic>>> notificationsAsync,
  ) {
    return SliverAppBar(
      expandedHeight: 120.0,
      floating: false,
      pinned: true,
      elevation: 0,
      backgroundColor: AppColors.primary,
      actions: [
        notificationsAsync.when(
          data: (notifications) {
            final hasUnread = notifications.any((n) => n['read'] != true);
            if (!hasUnread) return const SizedBox.shrink();
            return IconButton(
              icon: const Icon(LucideIcons.checkCheck, color: Colors.white),
              tooltip: "Tout marquer comme lu",
              onPressed: () => _markAllAsRead(context, uid, notifications),
            );
          },
          loading: () => const SizedBox.shrink(),
          error: (_, __) => const SizedBox.shrink(),
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        title: const Text(
          "Alertes",
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

  Widget _buildNotificationCard({
    required BuildContext context,
    required Map<String, dynamic> notif,
    required bool isRead,
    required String uid,
    required String notifId,
  }) {
    final type = notif['type'] as String? ?? 'info';
    final title = notif['title'] as String? ?? 'Notification';
    final message = notif['message'] as String? ?? '';
    final timestamp = notif['timestamp'];

    IconData icon;
    Color color;

    switch (type) {
      case 'payment':
        icon = LucideIcons.wallet;
        color = AppColors.primary;
        break;
      case 'ai_scan':
        icon = LucideIcons.wand2;
        color = const Color(0xFF0D9488);
        break;
      case 'welcome':
        icon = LucideIcons.graduationCap;
        color = Colors.orange;
        break;
      case 'warning':
        icon = LucideIcons.alertTriangle;
        color = Colors.orangeAccent;
        break;
      case 'success':
        icon = LucideIcons.checkCircle;
        color = AppColors.success;
        break;
      default:
        icon = LucideIcons.bell;
        color = AppColors.primary;
    }

    return GestureDetector(
      onTap: () {
        if (!isRead && notifId.isNotEmpty && uid.isNotEmpty) {
          _markAsRead(context, uid, notifId);
        }
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isRead ? Colors.white : color.withValues(alpha: 0.04),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: isRead ? Colors.transparent : color.withValues(alpha: 0.2),
            width: 1.2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: color.withValues(alpha: 0.1), shape: BoxShape.circle),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: TextStyle(
                            fontWeight: isRead ? FontWeight.w600 : FontWeight.bold,
                            fontSize: 15,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _formatTimestamp(timestamp),
                        style: const TextStyle(color: AppColors.textLight, fontSize: 11),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    message,
                    style: TextStyle(
                      color: isRead ? AppColors.textSecondary : AppColors.textPrimary,
                      fontSize: 13,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            if (!isRead)
              Container(
                width: 9,
                height: 9,
                margin: const EdgeInsets.only(left: 8, top: 4),
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
          ],
        ),
      ).animate().fadeIn(delay: const Duration(milliseconds: 80)).slideY(begin: 0.08),
    );
  }

  Widget _buildEmptyState() {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(
            color: AppColors.primary.withValues(alpha: 0.05),
            shape: BoxShape.circle,
          ),
          child: const Icon(LucideIcons.bellOff, color: AppColors.primary, size: 52),
        ),
        const SizedBox(height: 24),
        const Text(
          "Aucune notification",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        const SizedBox(height: 8),
        const Text(
          "Vos alertes de paiement et de validation\nde quittances apparaîtront ici.",
          textAlign: TextAlign.center,
          style: TextStyle(color: AppColors.textSecondary, fontSize: 14, height: 1.5),
        ),
      ],
    ).animate().fadeIn(duration: 400.ms);
  }
}
