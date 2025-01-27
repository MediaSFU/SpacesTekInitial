// ignore_for_file: use_build_context_synchronously

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../components/create_space.dart';
import '../components/header.dart';
import '../components/space_details.dart';
import '../components/spaces_list.dart';
import '../components/welcome.dart';

void main() {
  runApp(const App());
}

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SpacesTek',
      theme: ThemeData(
        primarySwatch: Colors.blue,
        scaffoldBackgroundColor: const Color(0xFFF7F9F9),
      ),
      initialRoute: '/',
      onGenerateRoute: RouteGenerator.generateRoute,
    );
  }
}

class RouteGenerator {
  static Route<dynamic> generateRoute(RouteSettings settings) {
    switch (settings.name) {
      case '/welcome':
        return MaterialPageRoute(builder: (_) => const WelcomePage());

      case '/':
        return MaterialPageRoute(
          builder: (_) => const RequireProfile(child: SpacesList()),
        );

      /// IMPORTANT: We expect the route name to be exactly '/space',
      /// and we pass the spaceId in `settings.arguments`.
      case '/space':
        final spaceId = settings.arguments as String?;
        return MaterialPageRoute(
          builder: (_) => RequireProfile(
            child: SpaceDetails(spaceId: spaceId),
          ),
        );

      case '/create-space':
        return MaterialPageRoute(
          builder: (_) => const RequireProfile(child: CreateSpace()),
        );

      default:
        return MaterialPageRoute(
          builder: (_) => const Scaffold(
            body: Center(child: Text('Page not found!')),
          ),
        );
    }
  }
}

/// A wrapper to ensure the user has selected a profile.
/// If not, redirects to `/welcome`.
class RequireProfile extends StatefulWidget {
  final Widget child;

  const RequireProfile({super.key, required this.child});

  @override
  // ignore: library_private_types_in_public_api
  _RequireProfileState createState() => _RequireProfileState();
}

class _RequireProfileState extends State<RequireProfile> {
  bool _hasProfile = false;

  @override
  void initState() {
    super.initState();
    _checkUserProfile();
  }

  Future<void> _checkUserProfile() async {
    final prefs = await SharedPreferences.getInstance();
    final currentUserId = prefs.getString('currentUserId');

    if (currentUserId != null) {
      setState(() {
        _hasProfile = true;
      });
    } else {
      Navigator.pushReplacementNamed(context, '/welcome');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_hasProfile) {
      // Prevent rendering anything until the check is complete
      return const SizedBox.shrink();
    }

    return Scaffold(
      appBar: const Header(),
      body: widget.child,
    );
  }
}
