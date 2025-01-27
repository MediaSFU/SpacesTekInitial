// ignore_for_file: use_build_context_synchronously
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api.dart';
import '../types/types.dart';

class Header extends StatefulWidget implements PreferredSizeWidget {
  const Header({super.key});

  @override
  // ignore: library_private_types_in_public_api
  _HeaderState createState() => _HeaderState();

  @override
  Size get preferredSize => const Size.fromHeight(60.0);
}

class _HeaderState extends State<Header> {
  UserProfile? currentUser;
  String? currentUserId;
  late Future<void> _loadUserFuture;
  static const double maxWidth = 800.0;

  @override
  void initState() {
    super.initState();
    _loadUserFuture = _loadCurrentUser();
  }

  Future<void> _loadCurrentUser() async {
    currentUserId = await _getLocalStorageItem('currentUserId');
    if (currentUserId != null) {
      UserProfile? user =
          await APIService.instance.fetchUserById(currentUserId!);
      if (user != null) {
        setState(() {
          currentUser = user.copyWith(
            avatarUrl: user.avatarUrl ?? 'https://www.mediasfu.com/logo192.png',
          );
        });
      } else {
        await _removeLocalStorageItem('currentUserId');
        Navigator.pushReplacementNamed(context, '/welcome');
      }
    }
  }

  /// Retrieves a string value from local storage using SharedPreferences.
  Future<String?> _getLocalStorageItem(String key) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(key);
  }

  /// Sets a string value in local storage using SharedPreferences.
  Future<void> _setLocalStorageItem(String key, String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(key, value);
  }

  /// Removes a string value from local storage using SharedPreferences.
  Future<void> _removeLocalStorageItem(String key) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(key);
  }

  /// Handles user logout by freeing the user, updating local storage, and navigating to the welcome page.
  Future<void> _handleLogout() async {
    if (currentUserId != null) {
      await APIService.instance.freeUser(currentUserId!);
      await _setLocalStorageItem('lastUserId', currentUserId!);
      await _removeLocalStorageItem('currentUserId');
      if (mounted) {
        Navigator.pushReplacementNamed(context, '/welcome');
      }
    }
  }

  /// Navigates to the home page when the title is tapped.
  void _navigateHome() {
    Navigator.pushNamed(context, '/');
  }

  String _resolveAvatarUrl(String? url) {
    if (kIsWeb && url != null && url.contains('pravatar.cc')) {
      // Generate a unique identifier for the fallback URL
      int? randomId;
      // first check if the url contains a unique query parameter
      if (url.contains('img=')) {
        randomId = int.tryParse(url.split('img=')[1]);
      }
      // if not, generate a random number
      randomId ??= Random().nextInt(1000);

      return 'https://picsum.photos/200?unique=$randomId';
    }
    return url ?? 'https://www.mediasfu.com/logo192.png';
  }

  Widget _buildHeaderContent() {
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: maxWidth),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Logo/Title
            GestureDetector(
              onTap: _navigateHome,
              child: const Text(
                'SpacesTek',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 18.0,
                  color: Colors.black,
                ),
              ),
            ),
            // User info and logout button
            if (currentUser != null)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  CircleAvatar(
                    backgroundImage:
                        NetworkImage(_resolveAvatarUrl(currentUser!.avatarUrl)),
                    radius: 20.0,
                  ),
                  const SizedBox(width: 8.0),
                  Text(
                    currentUser!.displayName,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.black,
                      fontSize: 14.0,
                    ),
                  ),
                  const SizedBox(width: 20.0),
                  TextButton.icon(
                    icon: const Icon(Icons.logout, color: Colors.blue),
                    label: const Text(
                      'Logout',
                      style: TextStyle(
                        color: Colors.blue,
                        fontSize: 14.0,
                      ),
                    ),
                    onPressed: _handleLogout,
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  AppBar _buildLoadingAppBar() {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 1.0,
      title: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: maxWidth),
          child: GestureDetector(
            onTap: _navigateHome,
            child: const Text(
              'SpacesTek',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18.0,
                color: Colors.black,
              ),
            ),
          ),
        ),
      ),
    );
  }

  AppBar _buildAppBar() {
    return AppBar(
      backgroundColor: Colors.white,
      elevation: 1.0,
      automaticallyImplyLeading: false,
      title: _buildHeaderContent(),
      titleSpacing: 0,
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _loadUserFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return _buildLoadingAppBar();
        }
        return _buildAppBar();
      },
    );
  }
}
