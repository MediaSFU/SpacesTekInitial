// ignore_for_file: constant_identifier_names

import 'dart:convert';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'package:collection/collection.dart';

import '../types/types.dart';

class APIService {
  // Singleton pattern
  APIService._privateConstructor();
  static final APIService instance = APIService._privateConstructor();

  // Constants
  static const bool USE_SERVER =
      true; // Toggle this to switch between local and server mode
  static const String SERVER_URL = 'http://10.0.0.125:3001';
  static const String USERS_KEY = 'users';
  static const String SPACES_KEY = 'spaces';

  // Data
  List<UserProfile> users = [];
  List<Space> spaces = [];

  // Initialize data
  Future<void> initialize() async {
    if (!USE_SERVER) {
      await _loadFromLocal();
    } else {
      await _readFromServer();
    }
  }

  // Load initial data from db.json
  Future<Map<String, dynamic>> _loadInitialData() async {
    String data = await rootBundle.loadString('assets/db.json');
    return json.decode(data);
  }

  // Load data from local storage
  Future<void> _loadFromLocal() async {
    final prefs = await SharedPreferences.getInstance();
    String? savedUsers = prefs.getString(USERS_KEY);
    String? savedSpaces = prefs.getString(SPACES_KEY);

    if (savedUsers != null && savedSpaces != null) {
      users = (json.decode(savedUsers) as List)
          .map((u) => UserProfile.fromJson(u))
          .toList();
      spaces = (json.decode(savedSpaces) as List)
          .map((s) => Space.fromJson(s))
          .toList();
    } else {
      // Load initial data from db.json
      Map<String, dynamic> originalData = await _loadInitialData();
      users = (originalData['users'] as List)
          .map((u) => UserProfile.fromJson(u))
          .toList();
      spaces = (originalData['spaces'] as List)
          .map((s) => Space.fromJson(s))
          .toList();
      await _writeToLocal();
    }
  }

  // Write data to local storage
  Future<void> _writeToLocal() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
        USERS_KEY, json.encode(users.map((u) => u.toJson()).toList()));
    await prefs.setString(
        SPACES_KEY, json.encode(spaces.map((s) => s.toJson()).toList()));
  }

  // Fetch from server
  Future<Map<String, dynamic>> _serverFetch(String path,
      {Map<String, String>? headers,
      Object? body,
      String method = 'GET'}) async {
    Uri uri = Uri.parse('$SERVER_URL$path');
    http.Response res;

    try {
      if (method == 'GET') {
        res = await http.get(uri, headers: headers);
      } else if (method == 'POST') {
        res = await http.post(uri, headers: headers, body: json.encode(body));
      } else if (method == 'PUT') {
        res = await http.put(uri, headers: headers, body: json.encode(body));
      } else {
        throw Exception('Unsupported HTTP method: $method');
      }

      if (res.statusCode >= 200 && res.statusCode < 300) {
        return json.decode(res.body);
      } else {
        var error = json.decode(res.body);
        throw Exception(error['error'] ?? 'Server error');
      }
    } catch (e) {
      throw Exception('Failed to fetch from server: $e');
    }
  }

  // Read from server
  Future<void> _readFromServer() async {
    try {
      Map<String, dynamic> data = await _serverFetch('/api/read');
      users =
          (data['users'] as List).map((u) => UserProfile.fromJson(u)).toList();
      spaces = (data['spaces'] as List).map((s) => Space.fromJson(s)).toList();
    } catch (e) {
      // Handle error, possibly fallback to local
      if (kDebugMode) {
        print(e);
      }
      await _loadFromLocal();
    }
  }

  // Write to server
  Future<void> _writeToServer() async {
    try {
      Map<String, dynamic> body = {
        'users': users.map((u) => u.toJson()).toList(),
        'spaces': spaces.map((s) => s.toJson()).toList(),
      };
      Map<String, dynamic> response = await _serverFetch('/api/write',
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: body);
      if (response['success'] != true) {
        throw Exception('Server error');
      }
      if (response['users'] != null && response['spaces'] != null) {
        users = (response['users'] as List)
            .map((u) => UserProfile.fromJson(u))
            .toList();
        spaces =
            (response['spaces'] as List).map((s) => Space.fromJson(s)).toList();
      }
    } catch (e) {
      throw Exception('Failed to write to server: $e');
    }
  }

  // Read from DB (local or server)
  Future<void> readFromDb() async {
    if (!USE_SERVER) {
      await _loadFromLocal();
    } else {
      await _readFromServer();
    }
  }

  // Write to DB (local or server)
  Future<void> writeToDb() async {
    if (!USE_SERVER) {
      await _writeToLocal();
    } else {
      await _writeToServer();
    }
  }

  // Fetch user by ID
  Future<UserProfile?> fetchUserById(String id) async {
    await readFromDb();
    return users.firstWhereOrNull((u) => u.id == id);
  }

  // Fetch all spaces
  Future<List<Space>> fetchSpaces() async {
    await readFromDb();
    return spaces;
  }

  // Fetch space by ID
  Future<Space?> fetchSpaceById(String id) async {
    await readFromDb();
    return spaces.firstWhereOrNull((space) => space.id == id);
  }

  // Fetch available users
  Future<List<UserProfile>> fetchAvailableUsers() async {
    await readFromDb();
    return users.where((u) => !u.taken).toList();
  }

  // Mark user as taken
  Future<void> markUserAsTaken(String userId) async {
    UserProfile? user = users.firstWhereOrNull((u) => u.id == userId);
    if (user != null) {
      user.taken = true;
      await writeToDb();
    }
  }

  // Create user profile
  Future<UserProfile> createProfile(String displayName,
      {String? avatarUrl}) async {
    String uniqueId = _generateUniqueId();
    UserProfile newUser = UserProfile(
      id: uniqueId,
      displayName: displayName,
      avatarUrl: avatarUrl ?? 'https://www.mediasfu.com/logo192.png',
      taken: true,
    );
    users.add(newUser);
    await writeToDb();
    return newUser;
  }

  // Free user
  Future<void> freeUser(String userId) async {
    UserProfile? user = users.firstWhereOrNull((u) => u.id == userId);
    if (user != null) {
      user.taken = false;
      await writeToDb();
    }
  }

  // Create space
  Future<Space> createSpace(
    String title,
    String description,
    UserProfile host, {
    CreateSpaceOptions? options,
  }) async {
    String spaceId = _generateUniqueId();
    String remoteName = 'remote_${_generateUniqueId()}';
    ParticipantData hostParticipant = ParticipantData(
      id: host.id,
      displayName: host.displayName,
      role: ParticipantRole.host,
      muted: false,
      avatarUrl: host.avatarUrl ?? 'https://www.mediasfu.com/logo192.png',
    );
    int startedAt = options?.startTime ?? DateTime.now().millisecondsSinceEpoch;

    Space newSpace = Space(
      id: spaceId,
      title: title,
      description: description,
      remoteName: remoteName,
      participants: [hostParticipant],
      host: hostParticipant.id,
      speakers: [],
      listeners: [],
      startedAt: startedAt,
      active: true,
      capacity: options?.capacity ?? 100,
      askToSpeak: options?.askToSpeak ?? false,
      askToSpeakQueue: [],
      askToSpeakHistory: [],
      askToSpeakTimestamps: {},
      askToJoin: options?.askToJoin ?? false,
      duration: options?.duration ?? (15 * 60 * 1000), // default 15min
      endedAt: null,
      askToJoinQueue: [],
      approvedToJoin: [],
      askToJoinHistory: [],
      banned: [],
      rejectedSpeakers: [],
    );

    spaces.add(newSpace);
    await writeToDb();
    return newSpace;
  }

  // Update space
  Future<void> updateSpace(String spaceId, Map<String, dynamic> updates) async {
    Space? space = spaces.firstWhereOrNull((s) => s.id == spaceId);
    if (space == null) return;
    updates.forEach((key, value) {
      switch (key) {
        case 'title':
          space.title = value;
          break;
        case 'description':
          space.description = value;
          break;
        case 'remoteName':
          space.remoteName = value;
          break;
        case 'participants':
          space.participants =
              (value as List).map((p) => ParticipantData.fromJson(p)).toList();
          break;
        case 'host':
          space.host = value;
          break;
        case 'speakers':
          space.speakers = List<String>.from(value);
          break;
        case 'listeners':
          space.listeners = List<String>.from(value);
          break;
        case 'startedAt':
          space.startedAt = value;
          break;
        case 'endedAt':
          space.endedAt = value;
          break;
        case 'active':
          space.active = value;
          break;
        case 'capacity':
          space.capacity = value;
          break;
        case 'duration':
          space.duration = value;
          break;
        case 'askToSpeak':
          space.askToSpeak = value;
          break;
        case 'askToSpeakQueue':
          space.askToSpeakQueue = List<String>.from(value);
          break;
        case 'askToSpeakHistory':
          space.askToSpeakHistory = List<String>.from(value);
          break;
        case 'askToSpeakTimestamps':
          space.askToSpeakTimestamps = Map<String, int>.from(value);
          break;
        case 'askToJoin':
          space.askToJoin = value;
          break;
        case 'askToJoinQueue':
          space.askToJoinQueue = List<String>.from(value);
          break;
        case 'approvedToJoin':
          space.approvedToJoin = List<String>.from(value);
          break;
        case 'askToJoinHistory':
          space.askToJoinHistory = List<String>.from(value);
          break;
        case 'banned':
          space.banned = List<String>.from(value);
          break;
        case 'rejectedSpeakers':
          space.rejectedSpeakers = List<String>.from(value);
          break;
        default:
          // Handle unknown keys or ignore
          break;
      }
    });
    await writeToDb();
  }

  // End space
  Future<void> endSpace(String spaceId) async {
    Space? space = spaces.firstWhereOrNull((s) => s.id == spaceId);
    if (space == null) return;
    space.active = false;
    space.endedAt = DateTime.now().millisecondsSinceEpoch;
    await writeToDb();
  }

  // Join space
  Future<Space?> joinSpace(String spaceId, UserProfile user,
      {bool asSpeaker = false, bool forceAdd = false}) async {
    Space? space = spaces.firstWhereOrNull((s) => s.id == spaceId);
    if (space == null) return null;

    if (space.participants.any((p) => p.id == user.id)) {
      return space;
    }

    // Handle askToJoin
    if (space.askToJoin &&
        !forceAdd &&
        !space.approvedToJoin.contains(user.id)) {
      if (space.askToJoinQueue.contains(user.id)) {
        // Already in queue
        return space;
      } else {
        // Add to queue
        space.askToJoinQueue.add(user.id);
        space.askToJoinHistory.add(user.id);
        await writeToDb();
        return space;
      }
    }

    if (!forceAdd) {
      ParticipantData newParticipant = ParticipantData(
        id: user.id,
        displayName: user.displayName,
        role: asSpeaker ? ParticipantRole.speaker : ParticipantRole.listener,
        muted: asSpeaker, // Speakers start muted
        avatarUrl: user.avatarUrl ?? 'https://www.mediasfu.com/logo192.png',
      );

      space.participants.add(newParticipant);
      if (asSpeaker) {
        space.speakers.add(newParticipant.id);
      } else {
        space.listeners.add(newParticipant.id);
      }
    } else {
      // Add to approvedToJoin if not already there
      if (!space.approvedToJoin.contains(user.id)) {
        space.approvedToJoin.add(user.id);
      }
    }

    // Remove from askToJoinQueue and history
    space.askToJoinQueue.remove(user.id);
    space.askToJoinHistory.remove(user.id);

    await writeToDb();
    return space;
  }

  // Mute participant
  Future<void> muteParticipant(
      String spaceId, String targetId, bool muted) async {
    Space? space = spaces.firstWhereOrNull((s) => s.id == spaceId);
    if (space == null) return;
    ParticipantData? participant =
        space.participants.firstWhereOrNull((p) => p.id == targetId);
    if (participant != null) {
      participant.muted = muted;
      await writeToDb();
    }
  }

  // Request to speak
  Future<void> requestToSpeak(String spaceId, String userId) async {
    Space? space = spaces.firstWhereOrNull((s) => s.id == spaceId);
    if (space == null || !space.askToSpeak) return;

    ParticipantData? participant =
        space.participants.firstWhereOrNull((p) => p.id == userId);
    if (participant == null) return;

    if (participant.role == ParticipantRole.listener) {
      if (!space.askToSpeakQueue.contains(userId)) {
        space.askToSpeakQueue.add(userId);
        space.askToSpeakHistory.add(userId);
        space.askToSpeakTimestamps[userId] =
            DateTime.now().millisecondsSinceEpoch;

        // Change role to requested
        participant.role = ParticipantRole.requested;
        await writeToDb();
      }
    }
  }

  // Approve request to speak
  Future<void> approveRequest(
      String spaceId, String userId, bool asSpeaker) async {
    Space? space = spaces.firstWhereOrNull((s) => s.id == spaceId);
    if (space == null) return;

    ParticipantData? participant =
        space.participants.firstWhereOrNull((p) => p.id == userId);
    if (participant == null) return;

    if (participant.role == ParticipantRole.requested) {
      participant.role =
          asSpeaker ? ParticipantRole.speaker : ParticipantRole.listener;
      participant.muted = asSpeaker;

      if (asSpeaker) {
        space.speakers.add(participant.id);
        space.listeners.remove(userId);
      } else {
        space.listeners.add(participant.id);
      }

      // Remove from askToSpeakQueue
      space.askToSpeakQueue.remove(userId);

      await writeToDb();
    }
  }

  // Reject request to speak
  Future<void> rejectRequest(String spaceId, String userId) async {
    Space? space = spaces.firstWhereOrNull((s) => s.id == spaceId);
    if (space == null) return;

    int participantIndex = space.participants.indexWhere((p) => p.id == userId);
    if (participantIndex != -1) {
      // Remove from askToSpeakQueue
      space.askToSpeakQueue.remove(userId);

      // Add to history
      space.askToSpeakHistory.add(userId);

      // Change role back to listener
      space.participants[participantIndex].role = ParticipantRole.listener;

      // Add to rejectedSpeakers
      space.rejectedSpeakers.add(userId);

      await writeToDb();
    }
  }

  // Grant speaking role
  Future<void> grantSpeakingRole(String spaceId, String userId) async {
    Space? space = spaces.firstWhereOrNull((s) => s.id == spaceId);
    if (space == null) return;

    ParticipantData? participant =
        space.participants.firstWhereOrNull((p) => p.id == userId);
    if (participant == null) return;

    // Remove from listeners if present
    space.listeners.remove(userId);

    // Update role
    participant.role = ParticipantRole.speaker;
    participant.muted = true; // Start muted
    space.speakers.add(userId);

    // Remove from askToSpeakQueue
    space.askToSpeakQueue.remove(userId);

    await writeToDb();
  }

  // Approve join request
  Future<void> approveJoinRequest(String spaceId, String userId,
      {bool asSpeaker = false}) async {
    Space? space = spaces.firstWhereOrNull((s) => s.id == spaceId);
    if (space == null) return;

    bool participantExists = space.participants.any((p) => p.id == userId);
    if (participantExists) return;

    // Check queue
    bool inQueue = space.askToJoinQueue.contains(userId);
    if (!inQueue) return;

    UserProfile? participant = users.firstWhereOrNull((u) => u.id == userId);
    if (participant == null) return;

    await joinSpace(spaceId, participant, asSpeaker: asSpeaker, forceAdd: true);

    await writeToDb();
  }

  // Reject join request
  Future<void> rejectJoinRequest(String spaceId, String userId) async {
    Space? space = spaces.firstWhereOrNull((s) => s.id == spaceId);
    if (space == null) return;

    // Remove from participants
    space.participants.removeWhere((p) => p.id == userId);

    // Remove from join queue
    space.askToJoinQueue.remove(userId);

    // Add to join history
    space.askToJoinHistory.add(userId);

    await writeToDb();
  }

  // Leave space
  Future<void> leaveSpace(String spaceId, String userId) async {
    Space? space = spaces.firstWhereOrNull((s) => s.id == spaceId);
    if (space == null) return;

    int participantIndex = space.participants.indexWhere((p) => p.id == userId);
    if (participantIndex > -1) {
      ParticipantData p = space.participants[participantIndex];
      space.participants.removeAt(participantIndex);

      // Remove from role arrays
      if (p.id == space.host) {
        // If host leaves, end the space
        space.active = false;
        space.endedAt = DateTime.now().millisecondsSinceEpoch;
      }

      if (p.role == ParticipantRole.speaker) {
        space.speakers.remove(p.id);
      } else if (p.role == ParticipantRole.listener) {
        space.listeners.remove(p.id);
      }

      // Remove from askToSpeakQueue if present
      space.askToSpeakQueue.remove(userId);

      await writeToDb();
    }
  }

  // Ban participant
  Future<void> banParticipant(String spaceId, String userId) async {
    Space? space = spaces.firstWhereOrNull((s) => s.id == spaceId);
    if (space == null) return;

    // Remove from participants
    space.participants.removeWhere((p) => p.id == userId);

    // Remove from roles
    space.speakers.remove(userId);
    space.listeners.remove(userId);

    // Remove from join queue
    space.askToJoinQueue.remove(userId);

    // Add to banned list
    space.banned.add(userId);

    await writeToDb();

    // If host is banned, end the space
    if (userId == space.host) {
      await endSpace(spaceId);
    }
  }

  // Helper method to generate unique IDs
  String _generateUniqueId() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    final random = Random();
    final result =
        List.generate(8, (index) => chars[random.nextInt(chars.length)]).join();
    return result;
  }
}
