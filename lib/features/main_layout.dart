import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fastnew/core/theme/app_colors.dart';
import 'package:fastnew/providers/auth_provider.dart';

class MainLayout extends ConsumerWidget {
  final Widget child;
  final String location;

  const MainLayout({
    super.key,
    required this.child,
    required this.location,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userDataAsync = ref.watch(userDataProvider);
    final double width = MediaQuery.of(context).size.width;
    final bool isDesktop = width >= 900;

    if (isDesktop) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        body: Row(
          children: [
            _buildSidebar(context, ref, userDataAsync),
            Expanded(
              child: child,
            ),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Builder(
          builder: (context) => IconButton(
            icon: const Icon(LucideIcons.menu, color: AppColors.primary),
            onPressed: () => Scaffold.of(context).openDrawer(),
          ),
        ),
        title: const Text(
          "UniPay TP",
          style: TextStyle(
            color: AppColors.primary,
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.wallet, color: AppColors.primary),
            tooltip: 'Payer un TP',
            onPressed: () => context.push('/payment'),
          ),
        ],
      ),
      drawer: _buildDrawer(context, ref, userDataAsync),
      body: child,
      bottomNavigationBar: _buildBottomNav(context, ref),
    );
  }

  Widget _buildSidebar(BuildContext context, WidgetRef ref, AsyncValue<Map<String, dynamic>?> userDataAsync) {
    final notificationsAsync = ref.watch(userNotificationsProvider);
    final unreadCount = notificationsAsync.maybeWhen(
      data: (list) => list.where((n) => n['read'] != true).length,
      orElse: () => 0,
    );

    return Container(
      width: 280,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF0056D2), Color(0xFF003D99)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Column(
        children: [
          const SizedBox(height: 32),
          // Logo & Brand
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(LucideIcons.graduationCap, color: Colors.white, size: 28),
              ),
              const SizedBox(width: 12),
              const Text(
                "UniPay TP",
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 20,
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Divider(color: Colors.white24, height: 1, indent: 20, endIndent: 20),
          const SizedBox(height: 24),
          // Student Profile Summary
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: userDataAsync.when(
              loading: () => const Center(child: CircularProgressIndicator(color: Colors.white)),
              error: (e, s) => const Center(child: Text("Erreur profil", style: TextStyle(color: Colors.white70))),
              data: (userData) {
                final nom = userData?['nom'] ?? 'Étudiant';
                final prenom = userData?['prenom'] ?? '';
                final matricule = userData?['matricule'] ?? 'N/A';
                final filiere = userData?['filiere'] ?? 'MIA';

                return Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1.5),
                        ),
                        child: const CircleAvatar(
                          radius: 20,
                          backgroundImage: NetworkImage("https://i.pravatar.cc/150?u=unipay"),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "$prenom $nom",
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              "$matricule • $filiere",
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(color: Colors.white70, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 32),
          // Navigation menu items
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              children: [
                _buildSidebarTile(
                  icon: LucideIcons.layoutGrid,
                  label: "Accueil",
                  isSelected: location == '/',
                  onTap: () => context.go('/'),
                ),
                const SizedBox(height: 8),
                _buildSidebarTile(
                  icon: LucideIcons.wand2,
                  label: "Scanner Quittance",
                  isSelected: location == '/scan-receipt',
                  onTap: () => context.push('/scan-receipt'),
                ),
                const SizedBox(height: 8),
                _buildSidebarTile(
                  icon: LucideIcons.history,
                  label: "Historique",
                  isSelected: location == '/history',
                  onTap: () => context.go('/history'),
                ),
                const SizedBox(height: 8),
                _buildSidebarTile(
                  icon: LucideIcons.bell,
                  label: "Alertes",
                  isSelected: location == '/notifications',
                  badgeCount: unreadCount,
                  onTap: () => context.go('/notifications'),
                ),
                const SizedBox(height: 8),
                _buildSidebarTile(
                  icon: LucideIcons.user,
                  label: "Mon Profil",
                  isSelected: location == '/profile',
                  onTap: () => context.go('/profile'),
                ),
              ],
            ),
          ),
          // Logout Button
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: InkWell(
              onTap: () async {
                await ref.read(authServiceProvider).signOut();
                if (context.mounted) {
                  context.go('/login');
                }
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                decoration: BoxDecoration(
                  color: Colors.redAccent.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.redAccent.withValues(alpha: 0.2)),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(LucideIcons.logOut, color: Colors.redAccent, size: 20),
                    SizedBox(width: 12),
                    Text(
                      "Déconnexion",
                      style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSidebarTile({
    required IconData icon,
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
    int badgeCount = 0,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white.withValues(alpha: 0.15) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isSelected ? Colors.white : Colors.white70,
              size: 20,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: isSelected ? Colors.white : Colors.white70,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  fontSize: 14,
                ),
              ),
            ),
            if (badgeCount > 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.redAccent,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  badgeCount.toString(),
                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawer(BuildContext context, WidgetRef ref, AsyncValue<Map<String, dynamic>?> userDataAsync) {
    return Drawer(
      child: Column(
        children: [
          // En-tête du Drawer
          userDataAsync.when(
            loading: () => Container(
              height: 200,
              color: AppColors.primary,
              child: const Center(child: CircularProgressIndicator(color: Colors.white)),
            ),
            error: (e, s) => Container(
              height: 200,
              color: AppColors.primary,
              child: const Center(child: Text("Erreur", style: TextStyle(color: Colors.white))),
            ),
            data: (userData) {
              final nom = userData?['nom'] ?? 'Étudiant';
              final prenom = userData?['prenom'] ?? '';
              final matricule = userData?['matricule'] ?? 'N/A';
              final filiere = userData?['filiere'] ?? 'MIA';

              return UserAccountsDrawerHeader(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF0056D2), Color(0xFF003D99)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                currentAccountPicture: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: const CircleAvatar(
                    backgroundImage: NetworkImage("https://i.pravatar.cc/150?u=unipay"),
                  ),
                ),
                accountName: Text(
                  "$prenom $nom",
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                accountEmail: Text(
                  "$matricule • Filière $filiere",
                  style: const TextStyle(color: Colors.white70),
                ),
              );
            },
          ),

          // Liste des options du Drawer
          ListTile(
            leading: const Icon(LucideIcons.layoutGrid, color: AppColors.primary),
            title: const Text("Accueil"),
            selected: location == '/',
            onTap: () {
              context.pop(); // Fermer le drawer
              context.go('/');
            },
          ),
          ListTile(
            leading: const Icon(LucideIcons.wand2, color: AppColors.primary),
            title: const Text("Scanner Quittance IA"),
            selected: location == '/scan-receipt',
            onTap: () {
              context.pop(); // Fermer le drawer
              context.push('/scan-receipt');
            },
          ),
          ListTile(
            leading: const Icon(LucideIcons.history, color: AppColors.primary),
            title: const Text("Historique"),
            selected: location == '/history',
            onTap: () {
              context.pop();
              context.go('/history');
            },
          ),
          ListTile(
            leading: const Icon(LucideIcons.bell, color: AppColors.primary),
            title: const Text("Alertes & Notifications"),
            selected: location == '/notifications',
            onTap: () {
              context.pop();
              context.go('/notifications');
            },
          ),
          ListTile(
            leading: const Icon(LucideIcons.user, color: AppColors.primary),
            title: const Text("Mon Profil"),
            selected: location == '/profile',
            onTap: () {
              context.pop();
              context.go('/profile');
            },
          ),
          
          const Divider(),
          const Spacer(),

          // Déconnexion
          ListTile(
            leading: const Icon(LucideIcons.logOut, color: Colors.redAccent),
            title: const Text("Déconnexion", style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
            onTap: () async {
              context.pop(); // Fermer le drawer
              await ref.read(authServiceProvider).signOut();
              if (context.mounted) {
                context.go('/login');
              }
            },
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  int _calculateSelectedIndex(String location) {
    if (location == '/') return 0;
    if (location == '/history') return 1;
    if (location == '/notifications') return 2;
    if (location == '/profile') return 3;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/');
        break;
      case 1:
        context.go('/history');
        break;
      case 2:
        context.go('/notifications');
        break;
      case 3:
        context.go('/profile');
        break;
    }
  }

  Widget _buildBottomNav(BuildContext context, WidgetRef ref) {
    final notificationsAsync = ref.watch(userNotificationsProvider);
    final unreadCount = notificationsAsync.maybeWhen(
      data: (list) => list.where((n) => n['read'] != true).length,
      orElse: () => 0,
    );

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: BottomNavigationBar(
        currentIndex: _calculateSelectedIndex(location),
        onTap: (index) => _onItemTapped(index, context),
        type: BottomNavigationBarType.fixed,
        backgroundColor: Colors.white,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.textLight,
        selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
        unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
        items: [
          const BottomNavigationBarItem(
            icon: Icon(LucideIcons.layoutGrid),
            label: 'Accueil',
          ),
          const BottomNavigationBarItem(
            icon: Icon(LucideIcons.history),
            label: 'Historique',
          ),
          BottomNavigationBarItem(
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(LucideIcons.bell),
                if (unreadCount > 0)
                  Positioned(
                    top: -4,
                    right: -6,
                    child: Container(
                      padding: const EdgeInsets.all(3),
                      decoration: const BoxDecoration(
                        color: Colors.redAccent,
                        shape: BoxShape.circle,
                      ),
                      constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                      child: Text(
                        unreadCount > 9 ? '9+' : '$unreadCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
              ],
            ),
            label: 'Alertes',
          ),
          const BottomNavigationBarItem(
            icon: Icon(LucideIcons.user),
            label: 'Profil',
          ),
        ],
      ),
    );
  }
}
