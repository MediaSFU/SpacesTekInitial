// ignore_for_file: use_build_context_synchronously
import 'dart:async';
import 'dart:math';
import 'package:collection/collection.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../api/api.dart';
import '../types/types.dart';
import 'spinner.dart';
import 'custom_modal.dart';
import 'participant_card.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SpaceDetails extends StatefulWidget {
  final String? spaceId;
  const SpaceDetails({super.key, this.spaceId});

  @override
  // ignore: library_private_types_in_public_api
  _SpaceDetailsState createState() => _SpaceDetailsState();
}

class _SpaceDetailsState extends State<SpaceDetails> {
  // Space and User Data
  final ValueNotifier<Space?> space = ValueNotifier<Space?>(null);
  final ValueNotifier<ParticipantData?> currentUser =
      ValueNotifier<ParticipantData?>(null);
  final ValueNotifier<bool> isLoading = ValueNotifier<bool>(true);
  final ValueNotifier<bool> canSpeak = ValueNotifier<bool>(false);
  final ValueNotifier<bool> showJoinRequests = ValueNotifier<bool>(false);
  final ValueNotifier<bool> showSpeakRequests = ValueNotifier<bool>(false);
  final ValueNotifier<String> message = ValueNotifier<String>("");

  bool isConnected = false;
  bool isMuted = false;

  bool scheduled = false;

  Timer? _spaceRefreshTimer;
  Timer? _messageTimer;

  // Lifecycle Methods
  @override
  void initState() {
    super.initState();
    if (widget.spaceId == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        Navigator.of(context)
          ..pop()
          ..pop();
      });
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Initialize once
    if (_spaceRefreshTimer == null && widget.spaceId != null) {
      _spaceRefreshTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
        if (!mounted) {
          timer.cancel();
          return;
        }
        fetchSpaceDetails();
      });
    }
  }

  @override
  void dispose() {
    _messageTimer?.cancel();
    _spaceRefreshTimer?.cancel();
    space.dispose();
    currentUser.dispose();
    isLoading.dispose();
    canSpeak.dispose();
    showJoinRequests.dispose();
    showSpeakRequests.dispose();
    message.dispose();
    super.dispose();
  }

  // Fetch Space Details from API
  Future<void> fetchSpaceDetails() async {
    final spaceId = widget.spaceId;
    if (spaceId == null) return;

    final prefs = await SharedPreferences.getInstance();
    final uid = prefs.getString('currentUserId');
    if (uid == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        Navigator.pushNamed(context, "/welcome");
      });
      return;
    }

    try {
      final fetchedSpace = await APIService.instance.fetchSpaceById(spaceId);
      if (fetchedSpace == null ||
          (fetchedSpace.endedAt != null && fetchedSpace.endedAt! > 0)) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          Navigator.pop(context);
        });
        return;
      }

      setState(() {
        space.value = fetchedSpace;
      });

      final participant = fetchedSpace.participants.firstWhereOrNull(
        (p) => p.id == uid,
      );
      if (participant != null) {
        currentUser.value = participant;
      }

      // Determine canSpeak status
      if (participant != null &&
          (participant.role == ParticipantRole.speaker ||
              participant.role == ParticipantRole.host ||
              !(fetchedSpace.askToSpeak))) {
        canSpeak.value = true;
      } else {
        canSpeak.value = false;
      }

      // Compute 'scheduled' based on current time and space's start time
      final now = DateTime.now().millisecondsSinceEpoch;
      scheduled = fetchedSpace.startedAt > now;
    } catch (e) {
      debugPrint('Error fetching space details: $e');
    } finally {
      isLoading.value = false;
    }
  }

  /// Disconnects the room and updates the state.
  Future<void> disconnectRoomFromSpace() async {}

  /// Handles joining the space via API and MediaSFU.
  Future<void> handleJoin() async {
    final spaceId = widget.spaceId;
    if (spaceId == null) return;

    final user = currentUser.value;
    if (user == null) return;

    if (space.value?.banned.contains(user.id) ?? false) {
      setMessage("You have been banned from this space.");
      return;
    }

    if ((space.value?.askToJoin ?? false) &&
        !(user.role == ParticipantRole.host ||
            space.value!.approvedToJoin.contains(user.id))) {
      // Handle join requests
      if (space.value!.askToJoinQueue.contains(user.id)) {
        setMessage("Your request to join is pending approval by the host.");
        return;
      } else if (space.value!.askToJoinHistory.contains(user.id)) {
        setMessage("Your request to join was rejected by the host.");
        return;
      }

      try {
        await APIService.instance.joinSpace(
            spaceId,
            UserProfile(
              id: user.id,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              taken: true,
            ),
            asSpeaker: !(space.value?.askToSpeak ?? false));
        setMessage(
            "Your request to join has been sent and is pending approval.");
        fetchSpaceDetails();
      } catch (e) {
        setMessage("Error requesting to join. Please try again.");
      }
    } else {
      // Directly join
      try {
        await APIService.instance.joinSpace(
            spaceId,
            UserProfile(
              id: user.id,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              taken: true,
            ),
            asSpeaker: !(space.value?.askToSpeak ?? false));
        fetchSpaceDetails();
      } catch (e) {
        setMessage("Error joining the space. Please try again.");
      }
    }
  }

  /// Handles leaving the space and disconnecting from MediaSFU.
  Future<void> handleLeave() async {
    final spaceId = widget.spaceId;
    if (spaceId == null) return;

    final user = currentUser.value;
    if (user == null) return;

    try {
      await APIService.instance.leaveSpace(spaceId, user.id);
      await disconnectRoomFromSpace();
      Future.delayed(const Duration(seconds: 1), () {
        if (!mounted) return;
        Navigator.pop(context);
      });
    } catch (e) {
      setMessage("Error leaving the space. Please try again.");
    }
  }

  /// Mutes a specific participant.
  Future<void> handleMuteParticipant(String participantId) async {
    final spaceId = widget.spaceId;
    if (spaceId == null) return;

    try {
      await APIService.instance.muteParticipant(spaceId, participantId, true);
      fetchSpaceDetails();
    } catch (e) {
      setMessage("Error muting participant. Please try again.");
    }
  }

  /// Ends the space if the current user is the host.
  Future<void> handleEndSpace() async {
    final spaceId = widget.spaceId;
    if (spaceId == null) return;

    try {
      await APIService.instance.endSpace(spaceId);
      await disconnectRoomFromSpace();
      Future.delayed(const Duration(seconds: 1), () {
        if (!mounted) return;
        Navigator.of(context)
          ..pop()
          ..pop();
      });
    } catch (e) {
      setMessage("Error ending the space. Please try again.");
    }
  }

  /// Removes a participant from the space if the current user is the host.
  Future<void> handleRemoveParticipant(String participantId) async {
    final spaceId = widget.spaceId;
    if (spaceId == null) return;

    try {
      setMessage("Participant removed successfully.");
      fetchSpaceDetails();
    } catch (e) {
      setMessage("Error removing participant. Please try again.");
    }
  }

  /// Toggles the microphone state.
  Future<void> handleToggleMic() async {
    final user = currentUser.value;
    if (user == null) return;

    if (user.role == ParticipantRole.speaker ||
        user.role == ParticipantRole.host ||
        !(space.value?.askToSpeak ?? false)) {
      try {} catch (e) {
        setMessage("Error toggling mic.");
      }
    } else {
      setMessage("You do not have permission to toggle your mic.");
    }
  }

  /// Checks and requests to speak.
  Future<void> checkRequestToSpeak() async {
    final spaceId = widget.spaceId;
    if (spaceId == null) return;

    final user = currentUser.value;
    if (user == null) return;

    if (space.value?.rejectedSpeakers.contains(user.id) ?? false) {
      setMessage("You have been rejected from speaking in this space.");
      return;
    }

    if (space.value?.askToSpeakQueue.contains(user.id) ?? false) {
      setMessage("Your request to speak is pending approval by the host.");
      return;
    }

    try {
      await APIService.instance.requestToSpeak(spaceId, user.id);
      setMessage(
          "Your request to speak has been sent and is pending approval.");
      fetchSpaceDetails();
    } catch (e) {
      setMessage("Error requesting to speak. Please try again.");
    }
  }

  /// Sets a temporary message.
  void setMessage(String msg) {
    if (!mounted) return;
    setState(() {
      message.value = msg;
    });
    _messageTimer?.cancel(); // Cancel any existing timer.
    _messageTimer = Timer(const Duration(seconds: 4), () {
      if (!mounted) return;
      setState(() {
        message.value = "";
      });
    });
  }

  // Helper Methods

  Future<void> approveJoinRequest(String userId) async {
    final spaceId = widget.spaceId;
    if (spaceId == null) return;

    try {
      await APIService.instance.approveJoinRequest(spaceId, userId);
      setMessage("Join request approved.");
      fetchSpaceDetails();
    } catch (e) {
      setMessage("Error approving join request.");
    }
  }

  Future<void> rejectJoinRequest(String userId) async {
    final spaceId = widget.spaceId;
    if (spaceId == null) return;

    try {
      await APIService.instance.rejectJoinRequest(spaceId, userId);
      setMessage("Join request rejected.");
      fetchSpaceDetails();
    } catch (e) {
      setMessage("Error rejecting join request.");
    }
  }

  Future<void> approveSpeakRequest(String userId) async {
    final spaceId = widget.spaceId;
    if (spaceId == null) return;

    try {
      await APIService.instance.approveRequest(spaceId, userId, true);
      setMessage("Speak request approved.");
      fetchSpaceDetails();
    } catch (e) {
      setMessage("Error approving speak request.");
    }
  }

  Future<void> rejectSpeakRequest(String userId) async {
    final spaceId = widget.spaceId;
    if (spaceId == null) return;

    try {
      await APIService.instance.rejectRequest(spaceId, userId);
      setMessage("Speak request rejected.");
      fetchSpaceDetails();
    } catch (e) {
      setMessage("Error rejecting speak request.");
    }
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

  /// Builds status icons with labels.
  Widget _buildStatusIcon(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 4.0, horizontal: 8.0),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(12.0),
        boxShadow: const [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 2.0,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          FaIcon(icon, color: Colors.white, size: 14.0),
          const SizedBox(width: 4.0),
          Text(
            label,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 12.0,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100], // Light background for the app
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints:
                const BoxConstraints(maxWidth: 800), // Max width set to 800px
            child: Container(
              padding: const EdgeInsets.all(16.0),
              child: Stack(
                children: [
                  ValueListenableBuilder<bool>(
                    valueListenable: isLoading,
                    builder: (context, loading, child) {
                      if (loading) {
                        return const Center(child: Spinner());
                      }

                      if (space.value == null) {
                        return const Center(child: Text('Space not found.'));
                      }

                      return SingleChildScrollView(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          children: [
                            // Header with Back and Action Buttons
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                // Back Button
                                ElevatedButton.icon(
                                  onPressed: () => Navigator.pop(context),
                                  icon: const FaIcon(
                                    FontAwesomeIcons.arrowLeft,
                                    size: 16.0,
                                  ),
                                  label: const Text('Back'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.transparent,
                                    foregroundColor: const Color(0xFF1DA1F2),
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 12.0, vertical: 8.0),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8.0),
                                    ),
                                    elevation: 0,
                                  ).copyWith(
                                    overlayColor:
                                        WidgetStateProperty.resolveWith<Color?>(
                                      (states) {
                                        if (states
                                            .contains(WidgetState.hovered)) {
                                          return const Color(0xFF1DA1F2)
                                              .withOpacity(0.1);
                                        }
                                        return null;
                                      },
                                    ),
                                  ),
                                ),

                                // Audio Controls (End Space or Leave)
                                if (currentUser.value != null &&
                                    space.value!.active)
                                  Row(
                                    children: [
                                      // Connection Status Indicator
                                      Container(
                                        padding: const EdgeInsets.all(4.0),
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: isConnected
                                              ? Colors.green
                                              : const Color(0xFFAF4646),
                                        ),
                                        child: Tooltip(
                                          message: isConnected
                                              ? "Connected"
                                              : "Disconnected",
                                          child: Container(
                                            width: 10,
                                            height: 10,
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              color: isConnected
                                                  ? Colors.green
                                                  : const Color(0xFFAF4646),
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8.0),

                                      // Conditional Buttons
                                      if (isConnected)
                                        if (canSpeak.value)
                                          Row(
                                            children: [
                                              // Toggle Mic Button
                                              ElevatedButton.icon(
                                                onPressed: handleToggleMic,
                                                icon: isMuted
                                                    ? const FaIcon(
                                                        FontAwesomeIcons
                                                            .microphoneSlash,
                                                        size: 16.0,
                                                      )
                                                    : const FaIcon(
                                                        FontAwesomeIcons
                                                            .microphone,
                                                        size: 16.0,
                                                      ),
                                                label: Text(isMuted
                                                    ? "Turn on Mic"
                                                    : "Turn off Mic"),
                                                style: ElevatedButton.styleFrom(
                                                  backgroundColor: isMuted
                                                      ? Colors.green
                                                      : Colors.blue,
                                                  foregroundColor: Colors.white,
                                                  padding: const EdgeInsets
                                                      .symmetric(
                                                      horizontal: 12.0,
                                                      vertical: 8.0),
                                                  shape: RoundedRectangleBorder(
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                            8.0),
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 8.0),
                                            ],
                                          )
                                        else
                                          // Request to Speak Button
                                          ElevatedButton.icon(
                                            onPressed: checkRequestToSpeak,
                                            icon: const FaIcon(
                                              FontAwesomeIcons.microphoneSlash,
                                              size: 16.0,
                                            ),
                                            label:
                                                const Text('Request to Speak'),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor:
                                                  const Color(0xFFE74C3C),
                                              foregroundColor: Colors.white,
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 12.0,
                                                      vertical: 8.0),
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(8.0),
                                              ),
                                            ),
                                          )
                                      else
                                        // Connect Audio Button
                                        ElevatedButton.icon(
                                          onPressed: () {
                                            setMessage("Not implemented yet.");
                                          },
                                          icon: const FaIcon(
                                            FontAwesomeIcons.connectdevelop,
                                            size: 16.0,
                                          ),
                                          label: const Text('Connect Audio'),
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.blue,
                                            foregroundColor: Colors.white,
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 12.0,
                                                vertical: 8.0),
                                            shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(8.0),
                                            ),
                                          ),
                                        ),

                                      const SizedBox(width: 8.0),

                                      // End Space or Leave Button
                                      ElevatedButton.icon(
                                        onPressed: currentUser.value!.role ==
                                                ParticipantRole.host
                                            ? handleEndSpace
                                            : handleLeave,
                                        icon: currentUser.value!.role ==
                                                ParticipantRole.host
                                            ? const FaIcon(
                                                FontAwesomeIcons.powerOff,
                                                size: 16.0,
                                              )
                                            : const FaIcon(
                                                FontAwesomeIcons
                                                    .rightFromBracket,
                                                size: 16.0,
                                              ),
                                        label: currentUser.value!.role ==
                                                ParticipantRole.host
                                            ? const Text('End Space')
                                            : const Text('Leave'),
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor:
                                              currentUser.value!.role ==
                                                      ParticipantRole.host
                                                  ? const Color(0xFFD93025)
                                                  : Colors.blue,
                                          foregroundColor: Colors.white,
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 12.0, vertical: 8.0),
                                          shape: RoundedRectangleBorder(
                                            borderRadius:
                                                BorderRadius.circular(8.0),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                              ],
                            ),
                            const SizedBox(height: 16.0),

                            // Message Display
                            ValueListenableBuilder<String>(
                              valueListenable: message,
                              builder: (context, msg, child) {
                                if (msg.isEmpty) {
                                  return const SizedBox.shrink();
                                }
                                return GestureDetector(
                                  onTap: () {
                                    setState(() {
                                      message.value = "";
                                    });
                                  },
                                  child: AnimatedContainer(
                                    duration: const Duration(milliseconds: 300),
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 8.0, horizontal: 16.0),
                                    margin: const EdgeInsets.only(bottom: 16.0),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFE0DB9A),
                                      border: Border.all(
                                          color: const Color(0xFFE0DB9A)),
                                      borderRadius: BorderRadius.circular(12.0),
                                      boxShadow: const [
                                        BoxShadow(
                                          color: Colors.black12,
                                          blurRadius: 4.0,
                                          offset: Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.error,
                                            color: Colors.red),
                                        const SizedBox(width: 8.0),
                                        Expanded(
                                          child: Text(
                                            msg,
                                            style: const TextStyle(
                                                color: Color(0xFF151414),
                                                fontSize: 12.0),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),

                            // Space Information Container
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(16.0),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF7F7F7),
                                borderRadius: BorderRadius.circular(10.0),
                                boxShadow: const [
                                  BoxShadow(
                                    color: Colors.black12,
                                    blurRadius: 10.0,
                                    offset: Offset(0, 4),
                                  ),
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.center,
                                children: [
                                  // Space Title
                                  Text(
                                    space.value!.title,
                                    style: const TextStyle(
                                      fontSize: 24.0,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.black87,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 8.0),

                                  // Space Description
                                  Text(
                                    space.value!.description,
                                    style: const TextStyle(
                                      fontSize: 16.0,
                                      color: Colors.grey,
                                      height: 1.6,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 16.0),

                                  // Status Icons
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      if (space.value!.endedAt != null &&
                                          !space.value!.active)
                                        _buildStatusIcon(
                                            FontAwesomeIcons.flagCheckered,
                                            'Ended',
                                            const Color(0xFFD93025)),
                                      if (scheduled &&
                                          !DateTime.fromMillisecondsSinceEpoch(
                                                  space.value!.endedAt!)
                                              .isBefore(DateTime.now()))
                                        _buildStatusIcon(
                                            FontAwesomeIcons.clock,
                                            'Scheduled',
                                            const Color(0xFFFBC02D)),
                                      if (!scheduled &&
                                          space.value!.active &&
                                          space.value!.endedAt == null)
                                        _buildStatusIcon(
                                            FontAwesomeIcons.circleCheck,
                                            'Live Now',
                                            const Color(0xFF1DA1F2)),
                                    ],
                                  ),
                                  const SizedBox(height: 16.0),

                                  // Viewer and Listener Counts
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Row(
                                        children: [
                                          const FaIcon(FontAwesomeIcons.users,
                                              color: Colors.grey, size: 14.0),
                                          const SizedBox(width: 4.0),
                                          Text(
                                              '${space.value!.speakers.isEmpty ? 1 : (space.value!.speakers.length + 1)} Speakers'),
                                        ],
                                      ),
                                      const SizedBox(width: 16.0),
                                      Row(
                                        children: [
                                          const FaIcon(FontAwesomeIcons.eye,
                                              color: Colors.grey, size: 14.0),
                                          const SizedBox(width: 4.0),
                                          Text(
                                              '${space.value!.listeners.length} Listeners'),
                                        ],
                                      ),
                                    ],
                                  ),

                                  const SizedBox(height: 16.0),

                                  // Progress Bar
                                  if (space.value!.active &&
                                      space.value!.endedAt == null)
                                    Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        ClipRRect(
                                          borderRadius:
                                              BorderRadius.circular(8.0),
                                          child: LinearProgressIndicator(
                                            value: (DateTime.now()
                                                        .millisecondsSinceEpoch -
                                                    space.value!.startedAt) /
                                                space.value!.duration!,
                                            minHeight: 8.0,
                                            backgroundColor: Colors.grey[300],
                                            valueColor:
                                                const AlwaysStoppedAnimation<
                                                    Color>(Color(0xFFA6CDE7)),
                                          ),
                                        ),
                                        const SizedBox(height: 4.0),
                                      ],
                                    ),
                                ],
                              ),
                            ),

                            const SizedBox(height: 12.0),

                            // Manage Requests (Join & Speak) for Hosts
                            if (currentUser.value != null &&
                                currentUser.value!.role ==
                                    ParticipantRole.host &&
                                space.value!.active &&
                                (space.value!.askToJoin ||
                                    space.value!.askToSpeak))
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(12.0),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(12.0),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Colors.black12,
                                      blurRadius: 6.0,
                                      offset: Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    if (space.value!.askToJoin)
                                      Stack(
                                        children: [
                                          ElevatedButton.icon(
                                            onPressed: () =>
                                                showJoinRequests.value = true,
                                            icon: const FaIcon(
                                              FontAwesomeIcons.userSlash,
                                              size: 14.0,
                                            ),
                                            label: const Text('Join Requests'),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor:
                                                  const Color(0xFF839FB0),
                                              foregroundColor: Colors.white,
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 12.0,
                                                      vertical: 8.0),
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(8.0),
                                              ),
                                            ),
                                          ),
                                          if (space
                                              .value!.askToJoinQueue.isNotEmpty)
                                            Positioned(
                                              top: -4,
                                              right: -4,
                                              child: Container(
                                                padding:
                                                    const EdgeInsets.all(2.0),
                                                decoration: const BoxDecoration(
                                                  color: Colors.red,
                                                  shape: BoxShape.circle,
                                                ),
                                                constraints:
                                                    const BoxConstraints(
                                                  minWidth: 16,
                                                  minHeight: 16,
                                                ),
                                                child: Center(
                                                  child: Text(
                                                    '${space.value!.askToJoinQueue.length}',
                                                    style: const TextStyle(
                                                      color: Colors.white,
                                                      fontSize: 10.0,
                                                    ),
                                                    textAlign: TextAlign.center,
                                                  ),
                                                ),
                                              ),
                                            ),
                                        ],
                                      ),
                                    const SizedBox(width: 16.0),
                                    if (space.value!.askToSpeak)
                                      Stack(
                                        children: [
                                          ElevatedButton.icon(
                                            onPressed: () =>
                                                showSpeakRequests.value = true,
                                            icon: const FaIcon(
                                              FontAwesomeIcons.microphone,
                                              size: 14.0,
                                            ),
                                            label: const Text('Speak Requests'),
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor:
                                                  const Color(0xFF839FB0),
                                              foregroundColor: Colors.white,
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 12.0,
                                                      vertical: 8.0),
                                              shape: RoundedRectangleBorder(
                                                borderRadius:
                                                    BorderRadius.circular(8.0),
                                              ),
                                            ),
                                          ),
                                          if (space.value!.askToSpeakQueue
                                              .isNotEmpty)
                                            Positioned(
                                              top: -4,
                                              right: -4,
                                              child: Container(
                                                padding:
                                                    const EdgeInsets.all(2.0),
                                                decoration: const BoxDecoration(
                                                  color: Colors.red,
                                                  shape: BoxShape.circle,
                                                ),
                                                constraints:
                                                    const BoxConstraints(
                                                  minWidth: 16,
                                                  minHeight: 16,
                                                ),
                                                child: Center(
                                                  child: Text(
                                                    '${space.value!.askToSpeakQueue.length}',
                                                    style: const TextStyle(
                                                      color: Colors.white,
                                                      fontSize: 10.0,
                                                    ),
                                                    textAlign: TextAlign.center,
                                                  ),
                                                ),
                                              ),
                                            ),
                                        ],
                                      ),
                                  ],
                                ),
                              ),

                            const SizedBox(height: 24.0),

                            // Participants Section
                            const Align(
                              alignment: Alignment.centerLeft,
                              child: Text(
                                'Participants',
                                style: TextStyle(
                                  fontSize: 20.0,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                ),
                              ),
                            ),
                            const SizedBox(height: 8.0),
                            Wrap(
                              spacing: 16.0,
                              runSpacing: 16.0,
                              children:
                                  space.value!.participants.map((participant) {
                                return SizedBox(
                                  width: 120.0,
                                  height: 120.0,
                                  child: ParticipantCard(
                                    participant: participant,
                                    isHost: currentUser.value?.role ==
                                        ParticipantRole.host,
                                    onMute: handleMuteParticipant,
                                    currentUserId: currentUser.value?.id,
                                    onToggleMic: handleToggleMic,
                                    onRemove: handleRemoveParticipant,
                                    space: space.value,
                                    // Add the video stream as an option if needed in ParticipantCard
                                    // videoStream: videoStream,
                                  ),
                                );
                              }).toList(),
                            ),

                            const SizedBox(height: 24.0),
                          ],
                        ),
                      );
                    },
                  ),

                  // Modals for Join and Speak Requests
                  Positioned(
                    bottom: 0,
                    left: 0,
                    right: 0,
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Join Requests Modal
                        ValueListenableBuilder<bool>(
                          valueListenable: showJoinRequests,
                          builder: (context, show, child) {
                            if (!show) return const SizedBox.shrink();
                            return CustomModal(
                              isOpen: show,
                              onClose: () => showJoinRequests.value = false,
                              title: "Join Requests",
                              child: space.value!.askToJoinQueue.isEmpty
                                  ? const Text("No join requests.")
                                  : Column(
                                      children:
                                          space.value!.askToJoinQueue.map((id) {
                                        final user = space.value!.participants
                                            .firstWhereOrNull(
                                                (p) => p.id == id);
                                        return ListTile(
                                          leading: CircleAvatar(
                                            backgroundImage: NetworkImage(
                                                _resolveAvatarUrl(
                                                    user?.avatarUrl)),
                                          ),
                                          title: Text(user?.displayName ?? id),
                                          trailing: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              IconButton(
                                                icon: const FaIcon(
                                                    FontAwesomeIcons.check,
                                                    color: Colors.green),
                                                onPressed: () =>
                                                    approveJoinRequest(id),
                                                tooltip: 'Approve',
                                              ),
                                              IconButton(
                                                icon: const FaIcon(
                                                    FontAwesomeIcons.xmark,
                                                    color: Colors.red),
                                                onPressed: () =>
                                                    rejectJoinRequest(id),
                                                tooltip: 'Reject',
                                              ),
                                            ],
                                          ),
                                        );
                                      }).toList(),
                                    ),
                            );
                          },
                        ),

                        // Speak Requests Modal
                        ValueListenableBuilder<bool>(
                          valueListenable: showSpeakRequests,
                          builder: (context, show, child) {
                            if (!show) return const SizedBox.shrink();
                            return CustomModal(
                              isOpen: show,
                              onClose: () => showSpeakRequests.value = false,
                              title: "Speak Requests",
                              child: space.value!.askToSpeakQueue.isEmpty
                                  ? const Text("No speak requests.")
                                  : Column(
                                      children: space.value!.askToSpeakQueue
                                          .map((id) {
                                        final user = space.value!.participants
                                            .firstWhereOrNull(
                                                (p) => p.id == id);
                                        return ListTile(
                                          leading: CircleAvatar(
                                            backgroundImage: NetworkImage(
                                                _resolveAvatarUrl(
                                                    user?.avatarUrl)),
                                          ),
                                          title: Text(user?.displayName ?? id),
                                          trailing: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              IconButton(
                                                icon: const FaIcon(
                                                    FontAwesomeIcons.check,
                                                    color: Colors.green),
                                                onPressed: () =>
                                                    approveSpeakRequest(id),
                                                tooltip: 'Approve Speak',
                                              ),
                                              IconButton(
                                                icon: const FaIcon(
                                                    FontAwesomeIcons.xmark,
                                                    color: Colors.red),
                                                onPressed: () =>
                                                    rejectSpeakRequest(id),
                                                tooltip: 'Reject Speak',
                                              ),
                                            ],
                                          ),
                                        );
                                      }).toList(),
                                    ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
