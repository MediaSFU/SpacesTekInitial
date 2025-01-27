// ignore_for_file: use_build_context_synchronously
import 'dart:async';
import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../api/api.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../types/types.dart';

class WelcomePage extends StatefulWidget {
  const WelcomePage({super.key});

  @override
  // ignore: library_private_types_in_public_api
  _WelcomePageState createState() => _WelcomePageState();
}

class _WelcomePageState extends State<WelcomePage> {
  List<UserProfile> availableUsers = [];
  String displayName = '';
  String avatarUrl = '';
  String? recentUserId;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    _loadAvailableUsers();

    // Refresh user list every 2 seconds
    _refreshTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      if (mounted) {
        _loadAvailableUsers();
      } else {
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadAvailableUsers() async {
    String? lastUsedId = await _getLocalStorageItem('lastUserId');
    setState(() {
      recentUserId = lastUsedId;
    });

    List<UserProfile> users = await APIService.instance.fetchAvailableUsers();
    List<UserProfile> updatedUsers = users
        .map((user) => user.copyWith(
              avatarUrl:
                  user.avatarUrl ?? 'https://www.mediasfu.com/logo192.png',
            ))
        .toList();

    setState(() {
      availableUsers = updatedUsers;
    });
  }

  Future<void> _selectUser(String userId) async {
    await APIService.instance.markUserAsTaken(userId);
    await _setLocalStorageItem('currentUserId', userId);
    Navigator.pushReplacementNamed(context, '/');
  }

  Future<void> _createUserProfile() async {
    if (displayName.trim().isEmpty) return;

    UserProfile newUser = await APIService.instance.createProfile(
      displayName.trim(),
      avatarUrl: avatarUrl.trim().isEmpty
          ? 'https://www.mediasfu.com/logo192.png'
          : avatarUrl.trim(),
    );
    await _setLocalStorageItem('currentUserId', newUser.id);
    Navigator.pushReplacementNamed(context, '/');
  }

  Future<String?> _getLocalStorageItem(String key) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(key);
  }

  Future<void> _setLocalStorageItem(String key, String value) async {
    final prefs = await SharedPreferences.getInstance();
    prefs.setString(key, value);
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

  @override
  Widget build(BuildContext context) {
    // Determine max width for the container
    const double maxWidth = 600.0;

    return Scaffold(
      backgroundColor: Colors.grey[100],
      body: Center(
        child: SingleChildScrollView(
          child: Container(
            constraints: const BoxConstraints(maxWidth: maxWidth),
            margin:
                const EdgeInsets.symmetric(horizontal: 16.0, vertical: 24.0),
            padding: const EdgeInsets.all(24.0),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12.0),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 20.0,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const Text(
                  'Welcome to SpacesTek',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 24.0, // h1 equivalent
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8.0),
                const Text(
                  'Join immersive audio discussions. Select a profile below or create a new one to get started.',
                  style: TextStyle(color: Colors.grey),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24.0),
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Pick a Profile',
                    style: TextStyle(
                      fontSize: 18.0, // h3 equivalent
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 16.0),
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount:
                        MediaQuery.of(context).size.width > 600 ? 3 : 2,
                    crossAxisSpacing: 16.0,
                    mainAxisSpacing: 16.0,
                    childAspectRatio: 0.8,
                  ),
                  itemCount: availableUsers.length,
                  itemBuilder: (context, index) {
                    UserProfile user = availableUsers[index];
                    bool isRecent = user.id == recentUserId;
                    return GestureDetector(
                      onTap: () => _selectUser(user.id),
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12.0),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.05),
                              blurRadius: 8.0,
                            ),
                          ],
                          border: isRecent
                              ? Border.all(color: Colors.blue, width: 2.0)
                              : null,
                        ),
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            CircleAvatar(
                              backgroundImage: NetworkImage(
                                _resolveAvatarUrl(user.avatarUrl),
                              ),
                              radius: 30.0, // 60px diameter
                            ),
                            const SizedBox(height: 8.0),
                            Text(
                              user.displayName,
                              style: const TextStyle(
                                fontSize: 14.0, // 0.9em approx
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            if (isRecent)
                              const Padding(
                                padding: EdgeInsets.only(top: 4.0),
                                child: Text(
                                  'Recently Used',
                                  style: TextStyle(
                                    color: Colors.blue,
                                    fontSize: 12.0,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
                const SizedBox(height: 32.0),
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Create a New Profile',
                    style: TextStyle(
                      fontSize: 18.0, // h3 equivalent
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 8.0),
                TextField(
                  decoration: const InputDecoration(
                    labelText: 'Display Name',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (value) {
                    setState(() {
                      displayName = value;
                    });
                  },
                ),
                const SizedBox(height: 16.0),
                TextField(
                  decoration: const InputDecoration(
                    labelText: 'Avatar URL (optional)',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (value) {
                    setState(() {
                      avatarUrl = value;
                    });
                  },
                ),
                const SizedBox(height: 24.0),
                SizedBox(
                  width: double.infinity,
                  height: 50.0,
                  child: ElevatedButton(
                    onPressed: _createUserProfile,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8.0),
                      ),
                    ),
                    child: const Text(
                      'Create',
                      style: TextStyle(
                        fontSize: 16.0, // 1em equivalent
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
