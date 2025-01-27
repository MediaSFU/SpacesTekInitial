import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import {
  useNavigation,
  NavigationProp,
  useFocusEffect,
} from '@react-navigation/native';
import {fetchUserById, fetchSpaces, joinSpace} from '../api';
import {Space, UserProfile, RootStackParamList} from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropDownPicker from 'react-native-dropdown-picker';

const ItemsPerPageOptions = [5, 10, 25, 50];

const SpacesList: React.FC = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [recentSpaces, setRecentSpaces] = useState<Space[]>([]);
  const [topSpaces, setTopSpaces] = useState<Space[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);
  const [pendingJoin, setPendingJoin] = useState<[string, string][]>([]);
  const [message, setMessage] = useState<string | null>(null);
  // const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterOpen, setFilterOpen] = useState<boolean>(false);
  const [filterItems, setFilterItems] = useState([
    {label: 'All', value: 'All'},
    {label: 'Live', value: 'Live'},
    {label: 'Scheduled', value: 'Scheduled'},
    {label: 'Ended', value: 'Ended'},
  ]);

  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const {width} = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const [pageOpen, setPageOpen] = useState(false);

  async function loadSpaces() {
    try {
      const allSpaces = await fetchSpaces();
      setSpaces(
        allSpaces.map(space => ({
          ...space,
          participants: space.participants.map(p => ({
            ...p,
            avatarUrl: p.avatarUrl || 'https://www.mediasfu.com/logo192.png',
          })),
        })),
      );

      // Retrieve userId from AsyncStorage
      const userId = await AsyncStorage.getItem('currentUserId');
      if (!userId) {
        setLoading(false);
        return;
      }

      const userRecentSpaces = allSpaces.filter(
        space =>
          space.participants.some(p => p.id === userId) ||
          space.approvedToJoin?.includes(userId),
      );
      const sortedTopSpaces = [...allSpaces].sort(
        (a, b) => b.participants.length - a.participants.length,
      );

      setRecentSpaces(userRecentSpaces.slice(0, 5));
      setTopSpaces(sortedTopSpaces.slice(0, 5));

      const spaceUser = await fetchUserById(userId);
      setUser(spaceUser!);

      // Check if user is in an active space
      // const active = allSpaces.find(
      //   (space) =>
      //     space.active &&
      //     !space.endedAt &&
      //     space.participants.some((p) => p.id === userId)
      // );

      //setActiveSpace(active || null);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load spaces.');
    }
  }

  useFocusEffect(
    React.useCallback(() => {
      const interval = setInterval(loadSpaces, 1000);

      return () => {
        clearInterval(interval);
      };
    }, []),
  );

  useEffect(() => {
    // Filter spaces based on search query and filter status
    let filtered = spaces.filter(
      space =>
        space.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        space.description.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    if (filterStatus !== 'All') {
      filtered = filtered.filter(space => {
        const now = Date.now();
        const ended = !!space.endedAt && !space.active;
        const scheduled = now < space.startedAt;
        const live = space.active && !ended && !scheduled;

        switch (filterStatus) {
          case 'Live':
            return live;
          case 'Scheduled':
            return scheduled;
          case 'Ended':
            return ended;
          default:
            return true;
        }
      });
    }

    setFilteredSpaces(filtered);
  }, [searchQuery, filterStatus, spaces]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery]);

  // Listen to pendingJoin changes and see if user has been approved
  useEffect(() => {
    if (pendingJoin.length === 0) {
      return;
    }

    const [spaceId, userId] = pendingJoin[pendingJoin.length - 1];
    const space = spaces.find(s => s.id === spaceId);
    if (!space) {
      return;
    }

    if (space.approvedToJoin?.includes(userId)) {
      setMessage(`You have been approved to join the space: ${space.title}`);
      setTimeout(() => setMessage(null), 5000);
      // Remove from pending join
      setPendingJoin(prev => prev.slice(0, -1));
    }
  }, [pendingJoin, spaces]);

  function isSpaceEnded(space: Space): boolean {
    return !!space.endedAt && !space.active;
  }

  function isSpaceScheduled(space: Space): boolean {
    return Date.now() < space.startedAt;
  }

  function participantCount(space: Space): number {
    return space.participants.length;
  }

  function getJoinStatus(space: Space, userId: string | null): string | null {
    if (!userId) {
      return null;
    }
    if (space.banned?.includes(userId)) {
      return 'Banned';
    }
    if (space.participants.some(p => p.id === userId)) {
      return 'Approved';
    }
    if (space.approvedToJoin?.includes(userId)) {
      return 'Lobby';
    }
    if (space.askToJoinQueue?.includes(userId)) {
      return 'Pending approval';
    }
    if (space.askToJoinHistory?.includes(userId)) {
      return 'Rejected';
    }
    if (!space.askToJoin) {
      return 'Lobby';
    }
    if (space.askToJoin && !space.participants.some(p => p.id === userId)) {
      return 'Request to join';
    }
    return 'Approved';
  }

  // Pagination calculations
  const totalItems = filteredSpaces.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastSpace = currentPage * itemsPerPage;
  const indexOfFirstSpace = indexOfLastSpace - itemsPerPage;
  const currentSpaces = filteredSpaces.slice(
    indexOfFirstSpace,
    indexOfLastSpace,
  );

  // Handlers for pagination
  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);
  const handlePrevPage = () =>
    setCurrentPage(prev => (prev > 1 ? prev - 1 : prev));
  const handleNextPage = () =>
    setCurrentPage(prev => (prev < totalPages ? prev + 1 : prev));
  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page
  };

  // Render Sidebar Cards
  const renderSidebarCard = (space: Space) => {
    const ended = isSpaceEnded(space);
    const scheduled = isSpaceScheduled(space);
    let statusColor = '#1da1f2';
    let statusText = 'Live';

    if (ended) {
      statusColor = '#d93025';
      statusText = 'Ended';
    } else if (scheduled) {
      statusColor = '#b58f00';
      statusText = 'Scheduled';
    }

    return (
      <TouchableOpacity
        key={space.id}
        style={styles.sidebarCard}
        onPress={() => navigation.navigate('SpaceDetails', {spaceId: space.id})}
        accessibilityLabel={`Navigate to ${space.title}`}
        accessibilityRole="button">
        <Text style={styles.sidebarCardTitle}>{space.title}</Text>
        <View style={styles.sidebarCardParticipants}>
          <Icon name="users" size={14} color="#555" />
          <Text style={styles.participantCount}>
            {participantCount(space)} participants
          </Text>
        </View>
        <Text style={[styles.sidebarCardStatus, {color: statusColor}]}>
          {statusText}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render Space Card
  const renderSpaceCard = ({item}: {item: Space}) => {
    const ended = isSpaceEnded(item);
    const scheduled = isSpaceScheduled(item);
    const now = Date.now();
    const diff = item.startedAt - now;
    const fiveMinutes = 5 * 60 * 1000;
    const canJoinNow = diff <= fiveMinutes && !ended;
    let statusIcon;
    if (ended) {
      statusIcon = (
        <View style={styles.statusContainer}>
          <Icon name="flag-checkered" size={14} color="#d93025" />
          <Text style={styles.endedText}>Ended</Text>
        </View>
      );
    } else if (scheduled) {
      statusIcon = (
        <View style={styles.statusContainer}>
          <Icon name="clock" size={14} color="#b58f00" />
          <Text style={styles.scheduledText}>Scheduled</Text>
        </View>
      );
    } else {
      statusIcon = (
        <View style={styles.statusContainer}>
          <Icon name="check-circle" size={14} color="#1da1f2" />
          <Text style={styles.liveText}>Live</Text>
        </View>
      );
    }
    const joinStatus = getJoinStatus(item, user?.id!);

    const handleJoin = async () => {
      if (!user) {
        return;
      }
      try {
        await joinSpace(item.id, user, !item.askToSpeak);
        navigation.navigate('SpaceDetails', {spaceId: item.id});
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to join the space.');
      }
    };

    const handleRequestJoin = async () => {
      if (!user) {
        return;
      }
      try {
        await joinSpace(item.id, user, !item.askToSpeak);
        setPendingJoin(prev => [...prev, [item.id, user.id]]);
        setMessage('Request to join sent. Waiting for approval.');
        setTimeout(() => setMessage(null), 5000);
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to request to join the space.');
      }
    };

    return (
      <View key={item.id} style={styles.spaceCard}>
        {/* Header */}
        <View style={styles.spaceCardHeader}>
          <Text style={styles.spaceCardTitle}>{item.title}</Text>
          <View style={styles.spaceCardStatus}>{statusIcon}</View>
        </View>

        {/* Description */}
        <Text style={styles.spaceCardDescription}>{item.description}</Text>

        {/* Meta Information */}
        <View style={styles.spaceCardMeta}>
          <View style={styles.spaceCardParticipants}>
            <Icon name="users" size={14} color="#555" />
            <Text style={styles.participantCount}>
              {participantCount(item)} participants
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.spaceActions}>
          {canJoinNow && !ended ? (
            joinStatus === 'Approved' ? (
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() =>
                  navigation.navigate('SpaceDetails', {spaceId: item.id})
                }
                accessibilityLabel={`Join ${item.title}`}
                accessibilityRole="button">
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
            ) : joinStatus === 'Lobby' ? (
              <TouchableOpacity
                style={styles.joinButton}
                onPress={handleJoin}
                accessibilityLabel={`Join ${item.title}`}
                accessibilityRole="button">
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
            ) : joinStatus === 'Request to join' ? (
              <TouchableOpacity
                style={styles.joinButton}
                onPress={handleRequestJoin}
                accessibilityLabel={`Request to join ${item.title}`}
                accessibilityRole="button">
                <Text style={styles.joinButtonText}>Request to join</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.joinStatus}>{joinStatus}</Text>
            )
          ) : ended ? (
            <Text style={styles.endedLabel}>This space has ended</Text>
          ) : scheduled ? (
            <Text style={styles.scheduledLabel}>
              Starts soon. Check back closer to start time.
            </Text>
          ) : (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() =>
                navigation.navigate('SpaceDetails', {spaceId: item.id})
              }
              accessibilityLabel={`View details of ${item.title}`}
              accessibilityRole="button">
              <Text style={styles.joinButtonText}>
                {!canJoinNow ? 'View Details' : 'Join'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Render Pagination Controls
  const renderPaginationControls = () => {
    if (totalPages <= 1) {
      return null;
    }

    return (
      <View style={styles.paginationControls}>
        {/* Items Per Page */}
        <View style={styles.itemsPerPage}>
          <Icon name="list" size={16} color="#555" />
          <Text style={styles.showText}>Show:</Text>
          <View style={styles.dropdown}>
            <DropDownPicker
              open={pageOpen}
              value={itemsPerPage}
              items={ItemsPerPageOptions.map(option => ({
                label: `${option}`,
                value: option,
              }))}
              setOpen={() => setPageOpen(!pageOpen)}
              setValue={(callback: (value: number) => number) =>
                handleItemsPerPageChange(callback(itemsPerPage))
              }
              setItems={() => {}}
              dropDownDirection="TOP"
              containerStyle={styles.dropdownContainer}
              style={styles.picker}
              dropDownContainerStyle={styles.dropDownContainer}
              zIndex={1000} // Ensure dropdown appears above other elements
              zIndexInverse={3000}
            />
          </View>
        </View>

        {/* Page Navigation */}
        <View style={styles.pageNavigation}>
          <TouchableOpacity
            onPress={handleFirstPage}
            disabled={currentPage === 1}
            style={[
              styles.pageButton,
              currentPage === 1 && styles.disabledButton,
            ]}
            accessibilityLabel="First Page"
            accessibilityRole="button">
            <Icon
              name="angle-double-left"
              size={16}
              color={currentPage === 1 ? '#a0d1f5' : '#fff'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePrevPage}
            disabled={currentPage === 1}
            style={[
              styles.pageButton,
              currentPage === 1 && styles.disabledButton,
            ]}
            accessibilityLabel="Previous Page"
            accessibilityRole="button">
            <Icon
              name="chevron-left"
              size={16}
              color={currentPage === 1 ? '#a0d1f5' : '#fff'}
            />
          </TouchableOpacity>
          <Text style={styles.currentPage}>
            Page {currentPage} of {totalPages}
          </Text>
          <TouchableOpacity
            onPress={handleNextPage}
            disabled={currentPage === totalPages}
            style={[
              styles.pageButton,
              currentPage === totalPages && styles.disabledButton,
            ]}
            accessibilityLabel="Next Page"
            accessibilityRole="button">
            <Icon
              name="chevron-right"
              size={16}
              color={currentPage === totalPages ? '#a0d1f5' : '#fff'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleLastPage}
            disabled={currentPage === totalPages}
            style={[
              styles.pageButton,
              currentPage === totalPages && styles.disabledButton,
            ]}
            accessibilityLabel="Last Page"
            accessibilityRole="button">
            <Icon
              name="angle-double-right"
              size={16}
              color={currentPage === totalPages ? '#a0d1f5' : '#fff'}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#1da1f2" />
      </View>
    );
  }

  return (
    <View style={styles.spacesListLayout}>
      {/* Left Sidebar - Top Spaces */}
      {isLargeScreen && (
        <View style={styles.leftSidebar}>
          <Text style={styles.sidebarHeader}>Top Spaces</Text>
          <FlatList
            data={topSpaces}
            keyExtractor={item => item.id}
            renderItem={({item}) => renderSidebarCard(item)}
          />
        </View>
      )}

      {/* Main Content */}
      <View
        style={
          isLargeScreen
            ? styles.spacesListContainer
            : styles.spacesListContainerFull
        }>
        {message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        )}
        <Text style={styles.mainHeader}>Browse Spaces</Text>

        {/* Search and Filter Bar */}
        <View style={[styles.searchFilterBar, styles.searchFilterBarLandscape]}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for spaces..."
              value={searchQuery}
              onChangeText={text => setSearchQuery(text)}
              accessibilityLabel="Search for spaces"
            />
            <Icon
              name="search"
              size={16}
              color="#aaa"
              style={styles.searchIcon}
            />
          </View>

          {/* Filter Dropdown */}
          <View style={styles.filterDropdown}>
            <Icon name="filter" size={14} color="#555" />
            <DropDownPicker
              open={filterOpen}
              value={filterStatus}
              items={filterItems}
              setOpen={setFilterOpen}
              setValue={(callback: (value: string) => string) =>
                setFilterStatus(callback(filterStatus))
              }
              setItems={setFilterItems}
              containerStyle={styles.dropdownContainerResponsive}
              style={styles.picker}
              dropDownContainerStyle={styles.dropDownContainer}
              zIndex={1000} // Ensure dropdown appears above other elements
              zIndexInverse={3000}
              placeholder="Filter"
            />
          </View>
        </View>

        {/* Create Space Button */}
        <TouchableOpacity
          style={styles.createSpaceButton}
          onPress={() => navigation.navigate('CreateSpace')}
          accessibilityLabel="Create a new space"
          accessibilityRole="button">
          <Text style={styles.createSpaceButtonText}>Create New Space</Text>
        </TouchableOpacity>

        {/* Spaces List */}
        <FlatList
          data={currentSpaces}
          keyExtractor={item => item.id}
          renderItem={renderSpaceCard}
          ListEmptyComponent={
            <Text style={styles.emptyListText}>No spaces found.</Text>
          }
        />

        {/* Pagination Controls */}
        {renderPaginationControls()}
      </View>

      {/* Right Sidebar - Recent Spaces */}
      {isLargeScreen && (
        <View style={styles.rightSidebar}>
          <Text style={styles.sidebarHeader}>Recent Spaces</Text>
          <FlatList
            data={recentSpaces}
            keyExtractor={item => item.id}
            renderItem={({item}) => renderSidebarCard(item)}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  spacesListLayout: {
    flex: 1,
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  showText: {
    marginLeft: 5,
    color: '#555',
  },
  leftSidebar: {
    flex: 0.2,
    marginTop: 0,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  rightSidebar: {
    flex: 0.2,
    marginTop: 0,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  sidebarHeader: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  sidebarCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  sidebarCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  sidebarCardParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  participantCount: {
    fontSize: 14,
    color: '#555',
    marginLeft: 5,
  },
  sidebarCardStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  spacesListContainer: {
    flex: 0.6,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 5,
    elevation: 2,
  },
  spacesListContainerFull: {
    flex: 1,
    padding: 5,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 5,
    elevation: 2,
  },
  mainHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  // Base style for the container that holds search & filter
  searchFilterBar: {
    marginBottom: 15,
    width: '100%',
  },

  // Landscape style (for both large and small screens)
  searchFilterBarLandscape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flex: 0.7,
    position: 'relative',
    marginRight: 10,
    minHeight: 35,
  },
  searchInput: {
    width: '100%',
    padding: 4,
    paddingRight: 35,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 12,
    color: '#333',
    height: 35,
  },
  searchIcon: {
    position: 'absolute',
    top: '50%',
    right: 5,
    transform: [{translateY: -8}],
    color: '#aaa',
  },
  filterDropdown: {
    flex: 0.3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    marginRight: 10,
  },
  picker: {
    height: 30,
    minHeight: 30,
    flex: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    fontSize: 12,
    paddingHorizontal: 5,
  },
  dropDownContainer: {
    borderColor: '#ddd',
    backgroundColor: '#fff',
    maxHeight: 150,
    borderRadius: 6,
  },
  dropdownContainer: {
    flex: 1,
  },
  dropdownContainerResponsive: {
    flex: 1,
    minWidth: 100,
    maxWidth: 150,
    height: 35,
    maxHeight: 35,
    zIndex: 1000,
    paddingHorizontal: 0,
    borderColor: '#ddd',
    borderRadius: 6,
  },
  // Create New Space Button
  createSpaceButton: {
    backgroundColor: '#28a745',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '60%',
    marginBottom: 15,
  },
  createSpaceButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  spaceCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  spaceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#ddd',
    paddingBottom: 5,
    marginBottom: 10,
  },
  spaceCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  spaceCardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  endedText: {
    color: '#d93025',
    marginLeft: 5,
    fontSize: 14,
  },
  scheduledText: {
    color: '#b58f00',
    marginLeft: 5,
    fontSize: 14,
  },
  liveText: {
    color: '#1da1f2',
    marginLeft: 5,
    fontSize: 14,
  },
  spaceCardDescription: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  spaceCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  spaceCardParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
  },
  joinButton: {
    backgroundColor: '#1da1f2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  endedLabel: {
    fontSize: 16,
    color: '#888',
  },
  scheduledLabel: {
    fontSize: 16,
    color: '#888',
  },
  joinStatus: {
    fontSize: 16,
    color: '#555',
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    flexWrap: 'wrap',
    gap: 10,
  },
  itemsPerPage: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdown: {
    flex: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 20,
    marginRight: 2,
  },
  pageNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    justifyContent: 'flex-end',
  },
  pageButton: {
    backgroundColor: '#1da1f2',
    padding: 8,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#a0d1f5',
  },
  currentPage: {
    fontSize: 16,
    color: '#555',
    marginHorizontal: 10,
  },
  messageContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  messageText: {
    color: '#c62828',
    textAlign: 'center',
  },
  emptyListText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    marginTop: 20,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SpacesList;
