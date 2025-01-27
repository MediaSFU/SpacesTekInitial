// ignore_for_file: use_build_context_synchronously
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api.dart';
import '../types/types.dart';

class CreateSpace extends StatefulWidget {
  const CreateSpace({super.key});

  @override
  // ignore: library_private_types_in_public_api
  _CreateSpaceState createState() => _CreateSpaceState();
}

class _CreateSpaceState extends State<CreateSpace> {
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _descriptionController = TextEditingController();
  final TextEditingController _startTimeController = TextEditingController();

  int _capacity = 25;
  bool _askToSpeak = false;
  bool _askToJoin = false;
  String? _error;
  int _duration = 15 * 60 * 1000; // Default duration: 15 minutes

  List<Map<String, dynamic>> get _durations => _generateDurations();

  @override
  void initState() {
    super.initState();
    // Optionally, you can initialize anything else here
  }

  List<Map<String, dynamic>> _generateDurations() {
    List<Map<String, dynamic>> durations = [];
    const int msPerMin = 60000;
    for (int m = 15; m <= 180; m += 15) {
      durations.add({'label': '$m min', 'value': m * msPerMin});
    }
    for (int h = 4; h <= 6; h++) {
      durations.add({'label': '$h hr', 'value': h * 60 * msPerMin});
    }
    return durations;
  }

  Future<void> _handleCreate() async {
    setState(() {
      _error = null; // Reset error message
    });

    final currentUserId = await _getLocalStorageItem('currentUserId');
    if (currentUserId == null) {
      Navigator.pushReplacementNamed(context, '/welcome');
      return;
    }

    final UserProfile? currentUser =
        await APIService.instance.fetchUserById(currentUserId);
    if (currentUser == null) {
      setState(() {
        _error = "User not found.";
      });
      return;
    }

    int startTimestamp = DateTime.now().millisecondsSinceEpoch;
    if (_startTimeController.text.isNotEmpty) {
      try {
        final DateTime chosenTime = DateFormat("yyyy-MM-ddTHH:mm")
            .parseStrict(_startTimeController.text);
        if (chosenTime.isBefore(DateTime.now()) ||
            chosenTime.isAfter(DateTime.now().add(const Duration(days: 3)))) {
          setState(() {
            _error =
                "Scheduled time must be within the next 3 days, and not in the past.";
          });
          return;
        }
        startTimestamp = chosenTime.millisecondsSinceEpoch;
      } catch (e) {
        setState(() {
          _error = "Invalid date format.";
        });
        return;
      }
    }

    if (_titleController.text.trim().length < 3) {
      setState(() {
        _error = "Title must be at least 3 characters.";
      });
      return;
    }

    if (_descriptionController.text.trim().length < 10) {
      setState(() {
        _error = "Description must be at least 10 characters.";
      });
      return;
    }

    try {
      final newSpace = await APIService.instance.createSpace(
        _titleController.text.trim(),
        _descriptionController.text.trim(),
        currentUser,
        options: CreateSpaceOptions(
          capacity: _capacity,
          askToSpeak: _askToSpeak,
          askToJoin: _askToJoin,
          startTime: startTimestamp,
          duration: _duration,
        ),
      );

      Navigator.pushNamed(context, '/space', arguments: newSpace.id);
    } catch (error) {
      setState(() {
        _error = "Failed to create space. Please try again.";
      });
      if (kDebugMode) {
        print("Error creating space: $error");
      }
    }
  }

  Future<String?> _getLocalStorageItem(String key) async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(key);
  }

  @override
  Widget build(BuildContext context) {
    // Determine max width for the container
    const double maxWidth = 600.0;

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          child: Container(
            constraints: const BoxConstraints(maxWidth: maxWidth),
            padding: const EdgeInsets.all(24.0),
            margin:
                const EdgeInsets.symmetric(horizontal: 16.0, vertical: 24.0),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12.0),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 8.0,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppBar(
                  backgroundColor: Colors.white,
                  elevation: 1.0,
                  leading: IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.blue),
                    onPressed: () => Navigator.pop(context),
                    tooltip: 'Back',
                  ),
                  title: const Text(
                    "Create a New Space",
                    style: TextStyle(
                        color: Colors.black, fontWeight: FontWeight.bold),
                  ),
                  centerTitle: true,
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 16.0),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12.0),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFCE8E6),
                        border: Border.all(color: const Color(0xFFD93025)),
                        borderRadius: BorderRadius.circular(8.0),
                      ),
                      child: Text(
                        _error!,
                        style: const TextStyle(
                          color: Color(0xFFD93025),
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                // Title Field
                const Text(
                  "Title",
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16.0),
                ),
                TextField(
                  controller: _titleController,
                  decoration: const InputDecoration(
                    hintText: "e.g., Evening Discussion",
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16.0),
                // Description Field
                const Text(
                  "Description",
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16.0),
                ),
                TextField(
                  controller: _descriptionController,
                  maxLines: 2,
                  decoration: const InputDecoration(
                    hintText: "Describe your space...",
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16.0),
                // Capacity Field
                const Text(
                  "Capacity",
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16.0),
                ),
                TextField(
                  keyboardType: TextInputType.number,
                  onChanged: (value) {
                    setState(() {
                      _capacity = int.tryParse(value) ?? _capacity;
                    });
                  },
                  decoration: const InputDecoration(
                    hintText: "Enter capacity (2-10000)",
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16.0),
                // Ask to Speak Toggle
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Ask to Speak",
                      style: TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16.0),
                    ),
                    Switch(
                      value: _askToSpeak,
                      onChanged: (value) => setState(() => _askToSpeak = value),
                      activeColor: Colors.blue,
                    ),
                  ],
                ),
                const SizedBox(height: 16.0),
                // Ask to Join Toggle
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      "Ask to Join",
                      style: TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 16.0),
                    ),
                    Switch(
                      value: _askToJoin,
                      onChanged: (value) => setState(() => _askToJoin = value),
                      activeColor: Colors.blue,
                    ),
                  ],
                ),
                const SizedBox(height: 16.0),
                // Start Time Field
                const Text(
                  "Start Time (optional)",
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16.0),
                ),
                GestureDetector(
                  onTap: () async {
                    FocusScope.of(context).unfocus(); // Close the keyboard
                    DateTime? pickedDate = await showDatePicker(
                      context: context,
                      initialDate: DateTime.now(),
                      firstDate: DateTime.now(),
                      lastDate: DateTime.now().add(const Duration(days: 3)),
                    );
                    if (pickedDate != null) {
                      TimeOfDay? pickedTime = await showTimePicker(
                        context: context,
                        initialTime: TimeOfDay.now(),
                      );
                      if (pickedTime != null) {
                        DateTime combinedDateTime = DateTime(
                          pickedDate.year,
                          pickedDate.month,
                          pickedDate.day,
                          pickedTime.hour,
                          pickedTime.minute,
                        );
                        _startTimeController.text =
                            DateFormat("yyyy-MM-ddTHH:mm")
                                .format(combinedDateTime);
                      }
                    }
                  },
                  child: AbsorbPointer(
                    child: TextField(
                      controller: _startTimeController,
                      decoration: const InputDecoration(
                        hintText: "yyyy-MM-ddTHH:mm",
                        border: OutlineInputBorder(),
                        suffixIcon: Icon(Icons.calendar_today),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16.0),
                // Duration Field
                const Text(
                  "Duration",
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16.0),
                ),
                DropdownButtonFormField<int>(
                  value: _duration,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                  ),
                  items: _durations.map((d) {
                    return DropdownMenuItem<int>(
                      value: d['value'],
                      child: Text(d['label']),
                    );
                  }).toList(),
                  onChanged: (value) =>
                      setState(() => _duration = value ?? _duration),
                ),
                const SizedBox(height: 32.0),
                // Create Space Button
                SizedBox(
                  width: double.infinity,
                  height: 50.0,
                  child: ElevatedButton(
                    onPressed: _handleCreate,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8.0),
                      ),
                      elevation: 2.0,
                    ),
                    child: const Text(
                      "Create Space",
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 16.0,
                        fontWeight: FontWeight.bold,
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
