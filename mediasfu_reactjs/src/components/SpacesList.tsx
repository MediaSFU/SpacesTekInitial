import React, { useEffect, useState } from "react";
import { fetchUserById, fetchSpaces, joinSpace } from "../api";
import { Space, UserProfile } from "../types";
import { useNavigate } from "react-router-dom";
import {
  FaUsers,
  FaClock,
  FaCheckCircle,
  FaFlagCheckered,
  FaSearch,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaList,
} from "react-icons/fa";
import "../styles/SpacesList.css";

export const SpacesList: React.FC = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [recentSpaces, setRecentSpaces] = useState<Space[]>([]);
  const [topSpaces, setTopSpaces] = useState<Space[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(5);
  const [pendingJoin, setPendingJoin] = useState<[string, string][]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [activeSpace, setActiveSpace] = useState<Space | null>(null); // manage this for playing media in an active space
  const navigate = useNavigate();

  async function loadSpaces() {
    const allSpaces = await fetchSpaces();
    setSpaces(
      allSpaces.map((space) => ({
        ...space,
        participants: space.participants.map((p) => ({
          ...p,
          avatarUrl: p.avatarUrl || "https://www.mediasfu.com/logo192.png",
        })),
      }))
    );

    // Calculate recent and top spaces
    const userId = localStorage.getItem("currentUserId");
    if (!userId) return;

    const userRecentSpaces = allSpaces.filter(
      (space) =>
        space.participants.some((p) => p.id === userId) ||
        space.approvedToJoin?.includes(userId)
    );
    const sortedTopSpaces = [...allSpaces].sort(
      (a, b) => b.participants.length - a.participants.length
    );

    setRecentSpaces(userRecentSpaces.slice(0, 5));
    setTopSpaces(sortedTopSpaces.slice(0, 5));

    const spaceUser = await fetchUserById(userId);
    setUser(spaceUser!);

    // Check if user is in an active space
    const active = allSpaces.find(
      (space) =>
        space.active &&
        !space.endedAt &&
        space.participants.some((p) => p.id === userId)
    );

    setActiveSpace(active || null);
  }

  useEffect(() => {
    loadSpaces();
    const interval = setInterval(loadSpaces, 2000); // Refresh every 5 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Filter spaces based on search query and filter status
    let filtered = spaces.filter(
      (space) =>
        space.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        space.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filterStatus !== "All") {
      filtered = filtered.filter((space) => {
        const now = Date.now();
        const ended = !!space.endedAt && !space.active;
        const scheduled = now < space.startedAt;
        const live = space.active && !ended && !scheduled;

        switch (filterStatus) {
          case "Live":
            return live;
          case "Scheduled":
            return scheduled;
          case "Ended":
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
  }, [filterStatus]);

  // listen to pendingJoin changes and see if user has been approved
  useEffect(() => {
    if (pendingJoin.length === 0) return;

    const [spaceId, userId] = pendingJoin[pendingJoin.length - 1];
    const space = spaces.find((s) => s.id === spaceId);
    if (!space) return;

    if (space.approvedToJoin?.includes(userId)) {
      setMessage(`You have been approved to join the space: ${space.title}`);
      setTimeout(() => setMessage(null), 5000);
      // Remove from pending join
      setPendingJoin((prev) => prev.slice(0, -1));
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
    if (!userId) return null;
    if (space.banned?.includes(userId)) return "Banned";
    if (space.participants.some((p) => p.id === userId)) return "Approved";
    if (space.approvedToJoin!.includes(userId)) return "Lobby";
    if (space.askToJoinQueue.includes(userId)) return "Pending approval";
    if (space.askToJoinHistory.includes(userId)) return "Rejected";
    if (!space.askToJoin) return "Lobby";
    if (space.askToJoin && !space.participants.some((p) => p.id === userId))
      return "Request to join";
    return "Approved";
  }

  // Pagination calculations
  const totalItems = filteredSpaces.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const indexOfLastSpace = currentPage * itemsPerPage;
  const indexOfFirstSpace = indexOfLastSpace - itemsPerPage;
  const currentSpaces = filteredSpaces.slice(
    indexOfFirstSpace,
    indexOfLastSpace
  );

  // Handlers for pagination
  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);
  const handlePrevPage = () =>
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));
  const handleNextPage = () =>
    setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="spaces-list-layout">
      {/* Left Sidebar - Top Spaces */}
      <div className="left-sidebar">
        <h3>Top Spaces</h3>
        <div className="sidebar-card-container">
          {topSpaces.map((space) => (
            <div
              key={space.id}
              className="sidebar-card"
              onClick={() => navigate(`/space/${space.id}`)}
            >
              <h4 className="sidebar-card-title">{space.title}</h4>
              <p className="sidebar-card-participants">
                <FaUsers /> {participantCount(space)} participants
              </p>
              <p className="sidebar-card-status">
                {isSpaceEnded(space)
                  ? "Ended"
                  : isSpaceScheduled(space)
                  ? "Scheduled"
                  : "Live"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="spaces-list-container container">
        {message && <div className="error-message">{message}</div>}
        <h1>Browse Spaces</h1>

        {/* Search and Filter Bar */}
        <div className="search-filter-bar">
          {/* Search Bar */}
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search for spaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <FaSearch className="search-icon" />
          </div>

          {/* Filter Dropdown */}
          <div className="filter-dropdown">
            <FaFilter className="filter-icon" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All</option>
              <option value="Live">Live</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Ended">Ended</option>
            </select>
          </div>
        </div>

        {/* Create Space Button */}
        <button
          className="create-space-button"
          onClick={() => navigate("/create-space")}
        >
          Create New Space
        </button>

        {/* Spaces List */}
        <ul className="spaces-list">
          {currentSpaces.map((space) => {
            const ended = isSpaceEnded(space);
            const scheduled = isSpaceScheduled(space);
            const now = Date.now();
            const diff = space.startedAt - now;
            const fiveMinutes = 5 * 60 * 1000;
            const canJoinNow = diff <= fiveMinutes && !ended;
            let statusIcon;
            if (ended)
              statusIcon = (
                <>
                  <FaFlagCheckered style={{ color: "#d93025" }} /> Ended
                </>
              );
            else if (scheduled)
              statusIcon = (
                <>
                  <FaClock style={{ color: "#b58f00" }} /> Scheduled
                </>
              );
            else
              statusIcon = (
                <>
                  <FaCheckCircle style={{ color: "#1da1f2" }} /> Live
                </>
              );
            const joinStatus = getJoinStatus(space, user?.id!);

            return (
              <li key={space.id} className="space-card">
                {/* Header */}
                <div className="space-card-header">
                  <h3 className="space-card-title">{space.title}</h3>
                  <span
                    className={`space-card-status ${
                      ended ? "ended" : scheduled ? "scheduled" : "live"
                    }`}
                  >
                    {statusIcon}
                  </span>
                </div>

                {/* Description */}
                <p className="space-card-description">{space.description}</p>

                {/* Meta Information */}
                <div className="space-card-meta">
                  <span className="space-card-participants">
                    <FaUsers /> {participantCount(space)} participants
                  </span>
                </div>

                {/* Actions */}
                <div className="space-actions">
                  {canJoinNow && !ended ? (
                    joinStatus === "Approved" ? (
                      <button onClick={() => navigate(`/space/${space.id}`)}>
                        Join
                      </button>
                    ) : joinStatus === "Lobby" ? (
                      <button
                        onClick={async () => {
                          await joinSpace(space.id, user!, !space.askToSpeak);
                          navigate(`/space/${space.id}`);
                        }}
                      >
                        Join
                      </button>
                    ) : joinStatus === "Request to join" ? (
                      <button
                        onClick={async () => {
                          await joinSpace(space.id, user!, !space.askToSpeak);
                          setPendingJoin((prev) => [
                            ...prev,
                            [space.id, user!.id],
                          ]);
                        }}
                      >
                        Request to join
                      </button>
                    ) : (
                      <span className="join-status">{joinStatus}</span>
                    )
                  ) : ended ? (
                    <span className="ended-label">This space has ended</span>
                  ) : scheduled ? (
                    <span className="scheduled-label">
                      Starts soon. Check back closer to start time.
                    </span>
                  ) : (
                    <button onClick={() => navigate(`/space/${space.id}`)}>
                      {!canJoinNow && "View Details"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {message && <div className="error-message">{message}</div>}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination-controls">
            {/* Items Per Page */}
            <div className="items-per-page">
              <FaList className="pagination-icon" />
              <label htmlFor="itemsPerPage">Show:</label>
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Page Navigation */}
            <div className="page-navigation">
              <button
                onClick={handleFirstPage}
                disabled={currentPage === 1}
                title="First Page"
                aria-label="First Page"
              >
                <FaAngleDoubleLeft />
              </button>
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                title="Previous Page"
                aria-label="Previous Page"
              >
                <FaChevronLeft />
              </button>
              <span className="current-page">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                title="Next Page"
                aria-label="Next Page"
              >
                <FaChevronRight />
              </button>
              <button
                onClick={handleLastPage}
                disabled={currentPage === totalPages}
                title="Last Page"
                aria-label="Last Page"
              >
                <FaAngleDoubleRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Recent Spaces */}
      <div className="right-sidebar">
        <h3>Recent Spaces</h3>
        <div className="sidebar-card-container">
          {recentSpaces.map((space) => (
            <div
              key={space.id}
              className="sidebar-card"
              onClick={() => navigate(`/space/${space.id}`)}
            >
              <h4 className="sidebar-card-title">{space.title}</h4>
              <p className="sidebar-card-participants">
                <FaUsers /> {participantCount(space)} participants
              </p>
              <p className="sidebar-card-status">
                {isSpaceEnded(space)
                  ? "Ended"
                  : isSpaceScheduled(space)
                  ? "Scheduled"
                  : "Live"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
