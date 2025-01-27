import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../types/types.dart';

typedef MuteCallback = void Function(String);
typedef ToggleMicCallback = void Function();
typedef RemoveCallback = void Function(String);
typedef ApproveCallback = void Function(String);
typedef RejectCallback = void Function(String);

class ParticipantCard extends StatefulWidget {
  final ParticipantData participant;
  final bool isHost;
  final MuteCallback onMute;
  final String? currentUserId;
  final ToggleMicCallback? onToggleMic;
  final RemoveCallback onRemove;
  final ApproveCallback? onApprove;
  final RejectCallback? onReject;
  final Space? space;

  const ParticipantCard({
    super.key,
    required this.participant,
    required this.isHost,
    required this.onMute,
    this.currentUserId,
    this.onToggleMic,
    required this.onRemove,
    this.onApprove,
    this.onReject,
    this.space,
  });

  @override
  // ignore: library_private_types_in_public_api
  _ParticipantCardState createState() => _ParticipantCardState();
}

class _ParticipantCardState extends State<ParticipantCard> {
  bool _isHovered = false;
  bool showRemove = false;
  bool showControls = false;

  @override
  void dispose() {
    super.dispose();
  }

  void _toggleControls() {
    setState(() {
      showControls = !showControls;
      showRemove = false; // Hide remove when showing controls
    });
  }

  void _toggleRemove() {
    setState(() {
      showRemove = !showRemove;
      showControls = false; // Hide controls when showing remove
    });
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
    final bool isMuted = widget.participant.muted;
    final bool isHost = widget.isHost;

    return GestureDetector(
      onDoubleTap: () {
        if (widget.isHost) {
          if (widget.participant.role == ParticipantRole.requested &&
              widget.isHost &&
              !(widget.space?.rejectedSpeakers
                      .contains(widget.participant.id) ??
                  false)) {
            _toggleControls();
          } else if (widget.isHost &&
              widget.participant.role != ParticipantRole.host) {
            _toggleRemove();
          }
        }
      },
      child: MouseRegion(
        onEnter: (_) {
          setState(() {
            _isHovered = true;
          });
        },
        onExit: (_) {
          setState(() {
            _isHovered = false;
          });
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: 120.0,
          height: 120.0,
          decoration: BoxDecoration(
            color: Colors.transparent,
            borderRadius: BorderRadius.circular(10.0), // Rounded corners
            boxShadow: _isHovered
                ? [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 14.0,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.05),
                      blurRadius: 8.0,
                      offset: const Offset(0, 2),
                    ),
                  ],
          ),
          transform: _isHovered
              ? Matrix4.translationValues(0, -2, 0)
              : Matrix4.identity(),
          child: Stack(
            children: [
              // Video Stream or Avatar
              Center(
                child: ClipOval(
                  child: widget.participant.avatarUrl!.isNotEmpty
                      ? Image.network(
                          _resolveAvatarUrl(widget.participant.avatarUrl),
                          width: 78.0, // 65% of 120px
                          height: 78.0,
                          fit: BoxFit.cover,
                        )
                      : Container(
                          width: 78.0,
                          height: 78.0,
                          color: Colors.grey[300],
                          child: Center(
                            child: Text(
                              widget.participant.displayName.isNotEmpty
                                  ? widget.participant.displayName[0]
                                      .toUpperCase()
                                  : '',
                              style: const TextStyle(
                                  color: Colors.white, fontSize: 24.0),
                            ),
                          ),
                        ),
                ),
              ),

              // Participant Name
              Positioned(
                bottom: 8.0,
                left: 0,
                right: 0,
                child: Center(
                  child: Text(
                    widget.participant.displayName,
                    style: const TextStyle(
                      fontSize: 12.0,
                      fontWeight: FontWeight.w400,
                      color: Colors.black,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),

              // Participant Role
              Positioned(
                bottom: 2.0,
                left: 0,
                right: 0,
                child: Center(
                  child: Text(
                    widget.participant.role
                        .toString()
                        .split('.')
                        .last
                        .capitalize(),
                    style: const TextStyle(
                      fontSize: 10.0,
                      color: Colors.grey,
                    ),
                  ),
                ),
              ),

              // Mic Icon at Top Left
              if (widget.participant.role != ParticipantRole.listener &&
                  !isHost)
                Positioned(
                  top: 8.0,
                  left: 15.0,
                  child: GestureDetector(
                    onTap: () {
                      if (widget.participant.id == widget.currentUserId &&
                          widget.onToggleMic != null) {
                        widget.onToggleMic!();
                      }
                    },
                    child: Container(
                      padding: const EdgeInsets.all(2.0), // Reduced padding
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.3),
                        shape: BoxShape.circle,
                      ),
                      child: FaIcon(
                        isMuted
                            ? FontAwesomeIcons.microphoneSlash
                            : FontAwesomeIcons.microphone,
                        size: 10.0,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),

              // Crown Icon for Host at Top Right
              if (widget.participant.role == ParticipantRole.host)
                const Positioned(
                  top: 8.0,
                  right: 10.0,
                  child: FaIcon(
                    FontAwesomeIcons.crown,
                    size: 12.0,
                    color: Colors.amber,
                    shadows: [
                      Shadow(
                        blurRadius: 3.0,
                        color: Colors.black26,
                        offset: Offset(0, 1),
                      ),
                    ],
                  ),
                ),

              // Remove Button (Trash Icon) at Top Right
              if (showRemove)
                Positioned(
                  top: -4.0,
                  right: 0.0,
                  child: Transform.translate(
                    offset: const Offset(-6.0, 0),
                    child: IconButton(
                      icon: const FaIcon(
                        FontAwesomeIcons.trash,
                        color: Colors.red,
                        size: 12.0,
                      ),
                      onPressed: () => widget.onRemove(widget.participant.id),
                      tooltip: 'Remove Participant',
                    ),
                  ),
                ),

              // Mute Other Button (if Host and not muted)
              if (widget.isHost &&
                  widget.participant.role != ParticipantRole.host &&
                  !isMuted)
                Positioned(
                  top: 8.0,
                  left: 15.0,
                  child: GestureDetector(
                    onTap: () => widget.onMute(widget.participant.id),
                    child: Container(
                      padding: const EdgeInsets.all(2.0), // Reduced padding
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.3),
                        shape: BoxShape.circle,
                      ),
                      child: const FaIcon(
                        FontAwesomeIcons.microphoneSlash,
                        size: 10.0,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),

              // Participant Request Actions (Approve/Reject)
              if (showControls)
                Positioned(
                  bottom: 0.0,
                  left: 0,
                  right: 0,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Approve Button
                      ElevatedButton(
                        onPressed: () {
                          // Implement approval logic
                          widget.onApprove!(widget.participant.id);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor:
                              const Color(0xFF1DA1F2), // Twitter blue
                          foregroundColor: Colors.white,
                          padding: EdgeInsets.zero, // Removed padding
                          minimumSize: const Size(30, 30), // Set minimum size
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(40.0),
                          ),
                          elevation: 1.0,
                        ),
                        child: const FaIcon(
                          FontAwesomeIcons.check,
                          size: 12.0,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 8.0),
                      // Reject Button
                      ElevatedButton(
                        onPressed: () {
                          // Implement rejection logic
                          widget.onReject!(widget.participant.id);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFE74C3C), // Red
                          foregroundColor: Colors.white,
                          padding: EdgeInsets.zero, // Removed padding
                          minimumSize: const Size(30, 30), // Set minimum size
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(40.0),
                          ),
                          elevation: 1.0,
                        ),
                        child: const FaIcon(
                          FontAwesomeIcons.xmark,
                          size: 12.0,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

extension StringExtension on String {
  String capitalize() {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1)}';
  }
}
