import 'dart:async';
import 'dart:math';
import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api.dart';
import '../types/types.dart';

class SpacesList extends StatefulWidget {
  const SpacesList({super.key});

  @override
  // ignore: library_private_types_in_public_api
  _SpacesListState createState() => _SpacesListState();
}

class _SpacesListState extends State<SpacesList>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  // State Variables using ValueNotifier
  final ValueNotifier<List<Space>> spaces = ValueNotifier<List<Space>>([]);
  final ValueNotifier<List<Space>> filteredSpaces =
      ValueNotifier<List<Space>>([]);
  final ValueNotifier<String> searchQuery = ValueNotifier<String>('');
  final ValueNotifier<String> filterStatus = ValueNotifier<String>('All');
  final ValueNotifier<List<Space>> recentSpaces =
      ValueNotifier<List<Space>>([]);
  final ValueNotifier<List<Space>> topSpaces = ValueNotifier<List<Space>>([]);
  final ValueNotifier<UserProfile?> user = ValueNotifier<UserProfile?>(null);
  final ValueNotifier<int> currentPage = ValueNotifier<int>(1);
  final ValueNotifier<int> itemsPerPage = ValueNotifier<int>(5);
  final ValueNotifier<List<List<String>>> pendingJoin =
      ValueNotifier<List<List<String>>>([]);
  final ValueNotifier<String?> message = ValueNotifier<String?>(null);
  final ValueNotifier<Space?> activeSpace = ValueNotifier<Space?>(null);

  List<Space>? cachedSpaces;

  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    loadSpaces();
    _filterSpaces();
    // Refresh every 2 seconds
    _refreshTimer = Timer.periodic(const Duration(seconds: 2), (timer) {
      if (mounted) {
        loadSpaces();
        _filterSpaces();
      } else {
        timer.cancel();
      }
    });
    // Listen to pendingJoin changes
    pendingJoin.addListener(_checkPendingJoin);
    // Listen to searchQuery and filterStatus changes
    searchQuery.addListener(_filterSpaces);
    filterStatus.addListener(_filterSpaces);
    // Listen to changes that affect pagination
    filteredSpaces.addListener(validateCurrentPage);
    itemsPerPage.addListener(validateCurrentPage);
    filterStatus.addListener(validateCurrentPage);
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    spaces.dispose();
    filteredSpaces.dispose();
    searchQuery.dispose();
    filterStatus.dispose();
    recentSpaces.dispose();
    topSpaces.dispose();
    user.dispose();
    currentPage.dispose();
    itemsPerPage.dispose();
    pendingJoin.dispose();
    message.dispose();
    activeSpace.dispose();
    filteredSpaces.removeListener(validateCurrentPage);
    itemsPerPage.removeListener(validateCurrentPage);
    filterStatus.removeListener(changeCurrentPage);
    super.dispose();
  }

  Future<void> loadSpaces() async {
    try {
      if (cachedSpaces != null && cachedSpaces!.isNotEmpty) {
        spaces.value = cachedSpaces!;
      }
      // Fetch spaces only if the user is present
      final userId = await getCurrentUserId();
      if (userId == null) return;

      final allSpaces = await APIService.instance.fetchSpaces();
      cachedSpaces = allSpaces;
      spaces.value = allSpaces.map((space) {
        return Space(
          id: space.id,
          title: space.title,
          description: space.description,
          remoteName: space.remoteName,
          participants: space.participants.map((p) {
            return ParticipantData(
              id: p.id,
              role: p.role,
              muted: p.muted,
              displayName: p.displayName,
              avatarUrl: p.avatarUrl!.isNotEmpty
                  ? p.avatarUrl
                  : 'https://www.mediasfu.com/logo192.png',
            );
          }).toList(),
          host: space.host,
          speakers: space.speakers,
          listeners: space.listeners,
          approvedToJoin: space.approvedToJoin,
          active: space.active,
          capacity: space.capacity,
          endedAt: space.endedAt,
          startedAt: space.startedAt,
          banned: space.banned,
          askToJoinQueue: space.askToJoinQueue,
          askToJoinHistory: space.askToJoinHistory,
          askToJoin: space.askToJoin,
          askToSpeak: space.askToSpeak,
          askToSpeakQueue: space.askToSpeakQueue,
          askToSpeakHistory: space.askToSpeakHistory,
          askToSpeakTimestamps: space.askToSpeakTimestamps,
          rejectedSpeakers: space.rejectedSpeakers,
        );
      }).toList();

      final userRecentSpaces = allSpaces.where((space) {
        return space.participants.any((p) => p.id == userId) ||
            (space.approvedToJoin.contains(userId));
      }).toList();

      final sortedTopSpaces = List<Space>.from(allSpaces)
        ..sort(
            (a, b) => b.participants.length.compareTo(a.participants.length));

      recentSpaces.value = userRecentSpaces.take(5).toList();
      topSpaces.value = sortedTopSpaces.take(5).toList();

      final fetchedUser = await APIService.instance.fetchUserById(userId);
      user.value = fetchedUser;

      // Check if user is in an active space
      final active = allSpaces.firstWhereOrNull(
        (space) =>
            space.active &&
            space.endedAt == null &&
            space.participants.any((p) => p.id == userId),
      );

      activeSpace.value = active;
    } catch (e) {
      // Handle errors as needed
      debugPrint('Error loading spaces  : $e');
    }
  }

  Future<String?> getCurrentUserId() async {
    // Implement your method to get current user ID, e.g., from shared_preferences
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('currentUserId');
  }

  void _filterSpaces() {
    final query = searchQuery.value.toLowerCase();
    List<Space> filtered = spaces.value.where((space) {
      return space.title.toLowerCase().contains(query) ||
          space.description.toLowerCase().contains(query);
    }).toList();

    if (filterStatus.value != 'All') {
      final now = DateTime.now().millisecondsSinceEpoch;
      filtered = filtered.where((space) {
        final ended = space.endedAt != null && !space.active;
        final scheduled = now < space.startedAt;
        final live = space.active && !ended && !scheduled;

        switch (filterStatus.value) {
          case 'Live':
            return live;
          case 'Scheduled':
            return scheduled;
          case 'Ended':
            return ended;
          default:
            return true;
        }
      }).toList();
    }

    filteredSpaces.value = filtered;
  }

  void _checkPendingJoin() {
    if (pendingJoin.value.isEmpty) return;

    final lastJoin = pendingJoin.value.last;
    final spaceId = lastJoin[0];
    final userId = lastJoin[1];
    final space = spaces.value.firstWhereOrNull((s) => s.id == spaceId);

    if (space != null && space.approvedToJoin.contains(userId) == true) {
      message.value =
          'You have been approved to join the space: ${space.title}';
      Future.delayed(const Duration(seconds: 5), () {
        message.value = null;
      });
      pendingJoin.value = List.from(pendingJoin.value)..removeLast();
    }
  }

  bool isSpaceEnded(Space space) {
    return space.endedAt != null && !space.active;
  }

  bool isSpaceScheduled(Space space) {
    return DateTime.now().millisecondsSinceEpoch < space.startedAt;
  }

  int participantCount(Space space) {
    return space.participants.length;
  }

  String? getJoinStatus(Space space, String? userId) {
    if (userId == null) return null;
    if (space.banned.contains(userId)) return 'Banned';
    if (space.participants.any((p) => p.id == userId)) return 'Approved';
    if (space.approvedToJoin.contains(userId)) return 'Lobby';
    if (space.askToJoinQueue.contains(userId)) return 'Pending approval';
    if (space.askToJoinHistory.contains(userId)) return 'Rejected';
    if (!space.askToJoin) return "Lobby";
    if (!space.participants.any((p) => p.id == userId)) {
      return 'Request to join';
    }
    return 'Approved';
  }

  // Pagination calculations
  int get totalItems => filteredSpaces.value.length;
  int get totalPages => max(1, (totalItems / itemsPerPage.value).ceil());

  List<Space> get currentSpaces {
    final indexOfLastSpace = currentPage.value * itemsPerPage.value;
    final indexOfFirstSpace = indexOfLastSpace - itemsPerPage.value;
    return filteredSpaces.value
        .skip(indexOfFirstSpace)
        .take(itemsPerPage.value)
        .toList();
  }

  void changeCurrentPage() {
    currentPage.value = 1;
  }

  void validateCurrentPage() {
    // Ensure totalPages is at least 1
    final newTotalPages = totalPages;

    if (currentPage.value > newTotalPages) {
      currentPage.value = newTotalPages; // Adjust to last valid page
    }

    if (currentPage.value < 1) {
      currentPage.value = 1; // Ensure at least page 1
    }
  }

  // Handlers for pagination
  void handleFirstPage() => currentPage.value = 1;
  void handleLastPage() => currentPage.value = totalPages;
  void handlePrevPage() {
    if (currentPage.value > 1) currentPage.value -= 1;
  }

  void handleNextPage() {
    if (currentPage.value < totalPages) currentPage.value += 1;
  }

  void handleItemsPerPageChange(int? value) {
    if (value != null) {
      itemsPerPage.value = value;
      currentPage.value = 1;
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Scaffold(
      body: LayoutBuilder(builder: (context, constraints) {
        bool isLargeScreen = constraints.maxWidth >= 1024;
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Left Sidebar - Top Spaces
            if (isLargeScreen)
              Expanded(
                flex: 1,
                child: Container(
                  margin: const EdgeInsets.only(top: 32.0),
                  padding: const EdgeInsets.all(16.0),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9F9F9),
                    borderRadius:
                        BorderRadius.circular(12.0), // Increased radius
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 8.0,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Top Spaces',
                          style: TextStyle(
                            fontSize: 20.0,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16.0),
                        ValueListenableBuilder<List<Space>>(
                          valueListenable: topSpaces,
                          builder: (context, topSpacesList, child) {
                            if (topSpacesList.isEmpty) {
                              return const Text('No top spaces available.');
                            }
                            return Column(
                              children: topSpacesList.map((space) {
                                return GestureDetector(
                                  onTap: () {
                                    Navigator.pushNamed(context, '/space',
                                        arguments: space.id);
                                  },
                                  child: Container(
                                    margin: const EdgeInsets.only(bottom: 16.0),
                                    padding: const EdgeInsets.all(16.0),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(
                                          12.0), // Increased radius
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.1),
                                          blurRadius: 8.0,
                                          offset: const Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          space.title,
                                          style: TextStyle(
                                            fontSize: 16.0,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.grey[800],
                                          ),
                                        ),
                                        const SizedBox(height: 8.0),
                                        Row(
                                          children: [
                                            FaIcon(
                                              FontAwesomeIcons.users,
                                              size: 14.0,
                                              color: Colors.grey[600],
                                            ),
                                            const SizedBox(width: 4.0),
                                            Text(
                                              '${participantCount(space)} participants',
                                              style: TextStyle(
                                                fontSize: 14.0,
                                                color: Colors.grey[600],
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4.0),
                                        Text(
                                          isSpaceEnded(space)
                                              ? 'Ended'
                                              : isSpaceScheduled(space)
                                                  ? 'Scheduled'
                                                  : 'Live',
                                          style: TextStyle(
                                            fontSize: 14.0,
                                            fontWeight: FontWeight.w600,
                                            color: isSpaceEnded(space)
                                                ? const Color(0xFFD93025)
                                                : isSpaceScheduled(space)
                                                    ? const Color(0xFFB58F00)
                                                    : const Color(0xFF1DA1F2),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }).toList(),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),

            // Main Content
            Expanded(
              flex: isLargeScreen ? 3 : 1, // Adjust flex based on screen size
              child: Container(
                padding: const EdgeInsets.all(16.0),
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      // Message
                      ValueListenableBuilder<String?>(
                        valueListenable: message,
                        builder: (context, msg, child) {
                          if (msg == null) return const SizedBox.shrink();
                          return Container(
                            padding: const EdgeInsets.all(12.0),
                            margin: const EdgeInsets.only(bottom: 16.0),
                            decoration: BoxDecoration(
                              color: Colors.red[100],
                              borderRadius: BorderRadius.circular(8.0),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error, color: Colors.red),
                                const SizedBox(width: 8.0),
                                Expanded(
                                  child: Text(
                                    msg,
                                    style: TextStyle(color: Colors.red[800]),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),

                      // Title
                      const Align(
                        alignment: Alignment.centerLeft,
                        child: Text(
                          'Browse Spaces',
                          style: TextStyle(
                            fontSize: 32.0,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24.0),

                      // Search and Filter Bar
                      Row(
                        children: [
                          // Search Bar
                          Expanded(
                            flex: 2,
                            child: ValueListenableBuilder<String>(
                              valueListenable: searchQuery,
                              builder: (context, query, child) {
                                return Stack(
                                  children: [
                                    TextField(
                                      onChanged: (value) {
                                        searchQuery.value = value;
                                      },
                                      decoration: InputDecoration(
                                        hintText: 'Search for spaces...',
                                        contentPadding:
                                            const EdgeInsets.symmetric(
                                          vertical: 16.0,
                                          horizontal: 16.0,
                                        ),
                                        border: OutlineInputBorder(
                                          borderRadius: BorderRadius.circular(
                                              12.0), // Increased radius
                                          borderSide: BorderSide(
                                              color: Colors.grey[300]!),
                                        ),
                                      ),
                                    ),
                                    const Positioned(
                                      right: 16.0,
                                      top: 16.0,
                                      child: FaIcon(
                                        FontAwesomeIcons.magnifyingGlass,
                                        color: Colors.grey,
                                        size: 16.0,
                                      ),
                                    ),
                                  ],
                                );
                              },
                            ),
                          ),
                          const SizedBox(width: 32.0),

                          // Filter Dropdown
                          ValueListenableBuilder<String>(
                            valueListenable: filterStatus,
                            builder: (context, status, child) {
                              return Row(
                                children: [
                                  FaIcon(
                                    FontAwesomeIcons.filter,
                                    color: Colors.grey[600],
                                  ),
                                  const SizedBox(width: 8.0),
                                  DropdownButton<String>(
                                    value: status,
                                    onChanged: (value) {
                                      if (value != null) {
                                        filterStatus.value = value;
                                      }
                                    },
                                    items: const [
                                      DropdownMenuItem(
                                        value: 'All',
                                        child: Text('All'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'Live',
                                        child: Text('Live'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'Scheduled',
                                        child: Text('Scheduled'),
                                      ),
                                      DropdownMenuItem(
                                        value: 'Ended',
                                        child: Text('Ended'),
                                      ),
                                    ],
                                    style: const TextStyle(color: Colors.black),
                                    underline: const SizedBox(),
                                  ),
                                ],
                              );
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 24.0),

                      // Create Space Button
                      Align(
                        alignment: Alignment.centerLeft,
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.pushNamed(context, '/create-space');
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor:
                                const Color(0xFF1DA1F2), // Updated color
                            padding: const EdgeInsets.symmetric(
                              vertical: 12.0,
                              horizontal: 24.0,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(
                                  12.0), // Increased radius
                            ),
                          ),
                          child: const Text(
                            'Create New Space',
                            style: TextStyle(
                              fontSize: 16.0,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 24.0),

                      // Spaces List
                      ValueListenableBuilder<int>(
                        valueListenable: currentPage,
                        builder: (context, page, child) {
                          return ValueListenableBuilder<List<Space>>(
                            valueListenable: filteredSpaces,
                            builder: (context, filteredList, child) {
                              final currentList = currentSpaces;
                              if (currentList.isEmpty) {
                                return Center(
                                  child: Text(
                                    'No spaces found.',
                                    style: TextStyle(
                                      fontSize: 16.0,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                );
                              }
                              return ListView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: currentList.length,
                                itemBuilder: (context, index) {
                                  final space = currentList[index];
                                  final duration = space.duration ?? 15;
                                  final ended = isSpaceEnded(space);
                                  final scheduled = isSpaceScheduled(space);
                                  final now =
                                      DateTime.now().millisecondsSinceEpoch;
                                  final diff = space.startedAt - now;
                                  const fiveMinutes = 5 * 60 * 1000;
                                  final canJoinNow =
                                      (diff <= fiveMinutes && !ended) ||
                                          (diff <= duration && !ended);
                                  ended
                                      ? const Row(
                                          children: [
                                            FaIcon(
                                              FontAwesomeIcons.flagCheckered,
                                              color: Color(0xFFD93025),
                                              size: 14.0,
                                            ),
                                            SizedBox(width: 4.0),
                                            Text('Ended'),
                                          ],
                                        )
                                      : scheduled
                                          ? const Row(
                                              children: [
                                                FaIcon(
                                                  FontAwesomeIcons.clock,
                                                  color: Color(0xFFB58F00),
                                                  size: 14.0,
                                                ),
                                                SizedBox(width: 4.0),
                                                Text('Scheduled'),
                                              ],
                                            )
                                          : const Row(
                                              children: [
                                                FaIcon(
                                                  FontAwesomeIcons.circleCheck,
                                                  color: Color(0xFF1DA1F2),
                                                  size: 14.0,
                                                ),
                                                SizedBox(width: 4.0),
                                                Text('Live'),
                                              ],
                                            );

                                  final joinStatus =
                                      getJoinStatus(space, user.value?.id);

                                  return Container(
                                    margin: const EdgeInsets.only(bottom: 16.0),
                                    padding: const EdgeInsets.all(24.0),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(
                                          12.0), // Increased radius
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.1),
                                          blurRadius: 8.0,
                                          offset: const Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        // Header
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              space.title,
                                              style: TextStyle(
                                                fontSize: 20.0,
                                                fontWeight: FontWeight.bold,
                                                color: Colors.grey[800],
                                              ),
                                            ),
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                vertical: 4.0,
                                                horizontal: 8.0,
                                              ),
                                              decoration: BoxDecoration(
                                                color: ended
                                                    ? const Color(0xFFFFEBEE)
                                                    : scheduled
                                                        ? const Color(
                                                            0xFFFFF8E1)
                                                        : const Color(
                                                            0xFFE0F7FA),
                                                borderRadius:
                                                    BorderRadius.circular(12.0),
                                              ),
                                              child: Text(
                                                ended
                                                    ? 'Ended'
                                                    : scheduled
                                                        ? 'Scheduled'
                                                        : 'Live',
                                                style: TextStyle(
                                                  fontSize: 14.0,
                                                  fontWeight: FontWeight.bold,
                                                  color: isSpaceEnded(space)
                                                      ? const Color(0xFFC62828)
                                                      : isSpaceScheduled(space)
                                                          ? const Color(
                                                              0xFFFBC02D)
                                                          : const Color(
                                                              0xFF00796B),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 16.0),

                                        // Description
                                        Text(
                                          space.description,
                                          style: TextStyle(
                                            fontSize: 16.0,
                                            color: Colors.grey[700],
                                            height: 1.5,
                                          ),
                                        ),
                                        const SizedBox(height: 16.0),

                                        // Meta Information
                                        Row(
                                          children: [
                                            FaIcon(
                                              FontAwesomeIcons.users,
                                              size: 14.0,
                                              color: Colors.grey[600],
                                            ),
                                            const SizedBox(width: 4.0),
                                            Text(
                                              '${participantCount(space)} participants',
                                              style: TextStyle(
                                                fontSize: 14.0,
                                                color: Colors.grey[600],
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 16.0),

                                        // Actions
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.end,
                                          children: [
                                            if (canJoinNow && !ended)
                                              if (joinStatus == 'Approved')
                                                ElevatedButton(
                                                  onPressed: () {
                                                    if (mounted) {
                                                      Navigator.pushNamed(
                                                          context, '/space',
                                                          arguments: space.id);
                                                    }
                                                  },
                                                  style:
                                                      ElevatedButton.styleFrom(
                                                    backgroundColor:
                                                        const Color(0xFF1DA1F2),
                                                    shape:
                                                        RoundedRectangleBorder(
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                              8.0),
                                                    ),
                                                  ),
                                                  child: const Text('Join'),
                                                )
                                              else if (joinStatus == 'Lobby')
                                                ElevatedButton(
                                                  onPressed: () {
                                                    try {
                                                      APIService.instance
                                                          .joinSpace(space.id,
                                                              user.value!,
                                                              asSpeaker: !space
                                                                  .askToSpeak);
                                                      if (mounted) {
                                                        Navigator.pushNamed(
                                                            context, '/space',
                                                            arguments:
                                                                space.id);
                                                      }
                                                    } catch (e) {
                                                      // Handle join space error
                                                      debugPrint(
                                                          'Error joining space: $e');
                                                    }
                                                  },
                                                  style:
                                                      ElevatedButton.styleFrom(
                                                    backgroundColor:
                                                        const Color(0xFF1DA1F2),
                                                    shape:
                                                        RoundedRectangleBorder(
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                              8.0),
                                                    ),
                                                  ),
                                                  child: const Text('Join'),
                                                )
                                              else if (joinStatus ==
                                                  'Request to join')
                                                ElevatedButton(
                                                  onPressed: () async {
                                                    try {
                                                      await APIService.instance
                                                          .joinSpace(space.id,
                                                              user.value!,
                                                              asSpeaker: !space
                                                                  .askToSpeak);
                                                      pendingJoin.value =
                                                          List.from(
                                                              pendingJoin.value)
                                                            ..add([
                                                              space.id,
                                                              user.value!.id
                                                            ]);
                                                    } catch (e) {
                                                      // Handle request join error
                                                      debugPrint(
                                                          'Error requesting to join space: $e');
                                                    }
                                                  },
                                                  style:
                                                      ElevatedButton.styleFrom(
                                                    backgroundColor:
                                                        const Color(0xFF1DA1F2),
                                                    shape:
                                                        RoundedRectangleBorder(
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                              8.0),
                                                    ),
                                                  ),
                                                  child: const Text(
                                                      'Request to join'),
                                                )
                                              else
                                                Padding(
                                                  padding: const EdgeInsets
                                                      .symmetric(
                                                    vertical: 4.0,
                                                    horizontal: 8.0,
                                                  ),
                                                  child: Text(
                                                    joinStatus ?? '',
                                                    style: TextStyle(
                                                      fontSize: 14.0,
                                                      color: Colors.grey[600],
                                                      backgroundColor:
                                                          const Color(
                                                              0xFFF0F8FF),
                                                    ),
                                                  ),
                                                )
                                            else if (ended)
                                              Text(
                                                'This space has ended',
                                                style: TextStyle(
                                                  fontSize: 14.0,
                                                  color: Colors.grey[600],
                                                ),
                                              )
                                            else if (scheduled)
                                              Text(
                                                'Starts soon. Check back closer to start time.',
                                                style: TextStyle(
                                                  fontSize: 14.0,
                                                  color: Colors.grey[600],
                                                ),
                                              )
                                            else
                                              ElevatedButton(
                                                onPressed: () {
                                                  Navigator.pushNamed(
                                                      context, '/space',
                                                      arguments: space.id);
                                                },
                                                style: ElevatedButton.styleFrom(
                                                  backgroundColor:
                                                      const Color(0xFF1DA1F2),
                                                  shape: RoundedRectangleBorder(
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                            8.0),
                                                  ),
                                                ),
                                                child: Text(canJoinNow
                                                    ? 'Join'
                                                    : 'View Details'),
                                              ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  );
                                },
                              );
                            },
                          );
                        },
                      ),

                      // Message again (if any)
                      ValueListenableBuilder<String?>(
                        valueListenable: message,
                        builder: (context, msg, child) {
                          if (msg == null) return const SizedBox.shrink();
                          return Container(
                            padding: const EdgeInsets.all(12.0),
                            margin: const EdgeInsets.only(top: 16.0),
                            decoration: BoxDecoration(
                              color: Colors.red[100],
                              borderRadius: BorderRadius.circular(8.0),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.error, color: Colors.red),
                                const SizedBox(width: 8.0),
                                Expanded(
                                  child: Text(
                                    msg,
                                    style: TextStyle(color: Colors.red[800]),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),

                      // Pagination Controls
                      ValueListenableBuilder<int>(
                        valueListenable: currentPage,
                        builder: (context, page, child) {
                          return ValueListenableBuilder<List<Space>>(
                            valueListenable: filteredSpaces,
                            builder: (context, filteredList, child) {
                              if (totalPages <= 1) {
                                return const SizedBox.shrink();
                              }

                              return Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  // Items Per Page
                                  Row(
                                    children: [
                                      FaIcon(
                                        FontAwesomeIcons.list,
                                        color: Colors.grey[600],
                                        size: 16.0,
                                      ),
                                      const SizedBox(width: 8.0),
                                      const Text('Show:'),
                                      const SizedBox(width: 8.0),
                                      DropdownButton<int>(
                                        value: itemsPerPage.value,
                                        onChanged: handleItemsPerPageChange,
                                        items: [5, 10, 25, 50].map((number) {
                                          return DropdownMenuItem<int>(
                                            value: number,
                                            child: Text('$number'),
                                          );
                                        }).toList(),
                                        underline: const SizedBox(),
                                        style: const TextStyle(
                                            color: Colors.black),
                                        icon: const Icon(Icons.arrow_drop_down,
                                            color: Colors.grey),
                                      ),
                                    ],
                                  ),

                                  // Page Navigation
                                  Row(
                                    children: [
                                      IconButton(
                                        icon: const FaIcon(
                                            FontAwesomeIcons.anglesLeft),
                                        onPressed: currentPage.value == 1
                                            ? null
                                            : handleFirstPage,
                                        tooltip: 'First Page',
                                      ),
                                      IconButton(
                                        icon: const FaIcon(
                                            FontAwesomeIcons.chevronLeft),
                                        onPressed: currentPage.value == 1
                                            ? null
                                            : handlePrevPage,
                                        tooltip: 'Previous Page',
                                      ),
                                      Text(
                                        'Page ${currentPage.value} of $totalPages',
                                        style: TextStyle(
                                            fontSize: 14.0,
                                            color: Colors.grey[700]),
                                      ),
                                      IconButton(
                                        icon: const FaIcon(
                                            FontAwesomeIcons.chevronRight),
                                        onPressed:
                                            currentPage.value == totalPages
                                                ? null
                                                : handleNextPage,
                                        tooltip: 'Next Page',
                                      ),
                                      IconButton(
                                        icon: const FaIcon(
                                            FontAwesomeIcons.anglesRight),
                                        onPressed:
                                            currentPage.value == totalPages
                                                ? null
                                                : handleLastPage,
                                        tooltip: 'Last Page',
                                      ),
                                    ],
                                  ),
                                ],
                              );
                            },
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Right Sidebar - Recent Spaces
            if (isLargeScreen)
              Expanded(
                flex: 1,
                child: Container(
                  margin: const EdgeInsets.only(top: 32.0),
                  padding: const EdgeInsets.all(16.0),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF9F9F9),
                    borderRadius:
                        BorderRadius.circular(12.0), // Increased radius
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 8.0,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Padding(
                          padding: EdgeInsets.only(bottom: 16.0),
                          child: Text(
                            'Recent Spaces',
                            style: TextStyle(
                              fontSize: 20.0,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        ValueListenableBuilder<List<Space>>(
                          valueListenable: recentSpaces,
                          builder: (context, recentSpacesList, child) {
                            if (recentSpacesList.isEmpty) {
                              return const Text('No recent spaces available.');
                            }
                            return Column(
                              children: recentSpacesList.map((space) {
                                return GestureDetector(
                                  onTap: () {
                                    Navigator.pushNamed(context, '/space',
                                        arguments: space.id);
                                  },
                                  child: Container(
                                    margin: const EdgeInsets.only(bottom: 16.0),
                                    padding: const EdgeInsets.all(16.0),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(
                                          12.0), // Increased radius
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.1),
                                          blurRadius: 8.0,
                                          offset: const Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          space.title,
                                          style: TextStyle(
                                            fontSize: 16.0,
                                            fontWeight: FontWeight.bold,
                                            color: Colors.grey[800],
                                          ),
                                        ),
                                        const SizedBox(height: 8.0),
                                        Row(
                                          children: [
                                            FaIcon(
                                              FontAwesomeIcons.users,
                                              size: 14.0,
                                              color: Colors.grey[600],
                                            ),
                                            const SizedBox(width: 4.0),
                                            Text(
                                              '${participantCount(space)} participants',
                                              style: TextStyle(
                                                fontSize: 14.0,
                                                color: Colors.grey[600],
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4.0),
                                        Text(
                                          isSpaceEnded(space)
                                              ? 'Ended'
                                              : isSpaceScheduled(space)
                                                  ? 'Scheduled'
                                                  : 'Live',
                                          style: TextStyle(
                                            fontSize: 14.0,
                                            fontWeight: FontWeight.w600,
                                            color: isSpaceEnded(space)
                                                ? const Color(0xFFD93025)
                                                : isSpaceScheduled(space)
                                                    ? const Color(0xFFB58F00)
                                                    : const Color(0xFF1DA1F2),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }).toList(),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        );
      }),
    );
  }
}
