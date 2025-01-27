class CreateSpaceOptions {
  final int? capacity;
  final bool? askToSpeak;
  final bool? askToJoin;
  final int? startTime;
  final int? duration; // in ms

  CreateSpaceOptions({
    this.capacity,
    this.askToSpeak,
    this.askToJoin,
    this.startTime,
    this.duration,
  });

  Map<String, dynamic> toJson() => {
        'capacity': capacity,
        'askToSpeak': askToSpeak,
        'askToJoin': askToJoin,
        'startTime': startTime,
        'duration': duration,
      };

  factory CreateSpaceOptions.fromJson(Map<String, dynamic> json) {
    return CreateSpaceOptions(
      capacity: json['capacity'],
      askToSpeak: json['askToSpeak'],
      askToJoin: json['askToJoin'],
      startTime: json['startTime'],
      duration: json['duration'],
    );
  }
}

enum ParticipantRole { host, speaker, listener, requested }

ParticipantRole participantRoleFromString(String role) {
  switch (role) {
    case 'host':
      return ParticipantRole.host;
    case 'speaker':
      return ParticipantRole.speaker;
    case 'listener':
      return ParticipantRole.listener;
    case 'requested':
      return ParticipantRole.requested;
    default:
      throw Exception('Unknown role: $role');
  }
}

String participantRoleToString(ParticipantRole role) {
  return role.toString().split('.').last;
}

class ParticipantData {
  final String id; // Unique ID for SDK
  final String displayName;
  ParticipantRole role;
  bool muted;
  final String? avatarUrl;

  ParticipantData({
    required this.id,
    required this.displayName,
    required this.role,
    required this.muted,
    this.avatarUrl,
  });

  factory ParticipantData.fromJson(Map<String, dynamic> json) {
    return ParticipantData(
      id: json['id'],
      displayName: json['displayName'],
      role: participantRoleFromString(json['role']),
      muted: json['muted'],
      avatarUrl: json['avatarUrl'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'displayName': displayName,
        'role': participantRoleToString(role),
        'muted': muted,
        'avatarUrl': avatarUrl,
      };

  ParticipantData copyWith({
    String? id,
    String? displayName,
    ParticipantRole? role,
    bool? muted,
    String? avatarUrl,
  }) {
    return ParticipantData(
      id: id ?? this.id,
      displayName: displayName ?? this.displayName,
      role: role ?? this.role,
      muted: muted ?? this.muted,
      avatarUrl: avatarUrl ?? this.avatarUrl,
    );
  }
}

class Space {
  final String id;
  String title;
  String description;
  String remoteName; // Used by the media server
  List<ParticipantData> participants;
  String host; // host participant ID
  List<String> speakers; // array of participant IDs
  List<String> listeners; // array of participant IDs
  int startedAt;
  int? endedAt;
  bool active;
  int capacity;
  int? duration; // in ms
  bool askToSpeak;
  List<String> askToSpeakQueue; // participant IDs requesting to speak
  List<String>
      askToSpeakHistory; // participant IDs who have requested in the past
  Map<String, int> askToSpeakTimestamps; // participantID -> timestamp
  bool askToJoin;
  List<String> askToJoinQueue; // participant IDs requesting to join
  List<String> approvedToJoin; // participant IDs approved to join
  List<String>
      askToJoinHistory; // participant IDs who have requested in the past
  List<String> banned; // participant IDs banned from the space
  List<String> rejectedSpeakers; // participant IDs rejected from speaking

  Space({
    required this.id,
    required this.title,
    required this.description,
    required this.remoteName,
    required this.participants,
    required this.host,
    required this.speakers,
    required this.listeners,
    required this.startedAt,
    this.endedAt,
    required this.active,
    required this.capacity,
    this.duration,
    required this.askToSpeak,
    required this.askToSpeakQueue,
    required this.askToSpeakHistory,
    required this.askToSpeakTimestamps,
    required this.askToJoin,
    required this.askToJoinQueue,
    required this.approvedToJoin,
    required this.askToJoinHistory,
    required this.banned,
    required this.rejectedSpeakers,
  });

  factory Space.fromJson(Map<String, dynamic> json) {
    return Space(
      id: json['id'],
      title: json['title'],
      description: json['description'],
      remoteName: json['remoteName'],
      participants: (json['participants'] as List)
          .map((p) => ParticipantData.fromJson(p))
          .toList(),
      host: json['host'],
      speakers: List<String>.from(json['speakers']),
      listeners: List<String>.from(json['listeners']),
      startedAt: json['startedAt'],
      endedAt: json['endedAt'],
      active: json['active'],
      capacity: json['capacity'],
      duration: json['duration'],
      askToSpeak: json['askToSpeak'],
      askToSpeakQueue: List<String>.from(json['askToSpeakQueue']),
      askToSpeakHistory: List<String>.from(json['askToSpeakHistory']),
      askToSpeakTimestamps: Map<String, int>.from(json['askToSpeakTimestamps']),
      askToJoin: json['askToJoin'],
      askToJoinQueue: List<String>.from(json['askToJoinQueue']),
      approvedToJoin: List<String>.from(json['approvedToJoin']),
      askToJoinHistory: List<String>.from(json['askToJoinHistory']),
      banned: List<String>.from(json['banned']),
      rejectedSpeakers: List<String>.from(json['rejectedSpeakers']),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'remoteName': remoteName,
        'participants': participants.map((p) => p.toJson()).toList(),
        'host': host,
        'speakers': speakers,
        'listeners': listeners,
        'startedAt': startedAt,
        'endedAt': endedAt,
        'active': active,
        'capacity': capacity,
        'duration': duration,
        'askToSpeak': askToSpeak,
        'askToSpeakQueue': askToSpeakQueue,
        'askToSpeakHistory': askToSpeakHistory,
        'askToSpeakTimestamps': askToSpeakTimestamps,
        'askToJoin': askToJoin,
        'askToJoinQueue': askToJoinQueue,
        'approvedToJoin': approvedToJoin,
        'askToJoinHistory': askToJoinHistory,
        'banned': banned,
        'rejectedSpeakers': rejectedSpeakers,
      };
}

class UserProfile {
  final String id;
  final String displayName;
  final String? avatarUrl;
  bool taken;
  String? password; // optional if we introduce password

  UserProfile({
    required this.id,
    required this.displayName,
    this.avatarUrl,
    required this.taken,
    this.password,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'],
      displayName: json['displayName'],
      avatarUrl: json['avatarUrl'],
      taken: json['taken'],
      password: json['password'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'displayName': displayName,
        'avatarUrl': avatarUrl,
        'taken': taken,
        'password': password,
      };

  UserProfile copyWith({
    String? id,
    String? displayName,
    String? avatarUrl,
    bool? taken,
    String? password,
  }) {
    return UserProfile(
      id: id ?? this.id,
      displayName: displayName ?? this.displayName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      taken: taken ?? this.taken,
      password: password ?? this.password,
    );
  }
}
