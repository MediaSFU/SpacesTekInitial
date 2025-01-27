import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchSpaceById,
  joinSpace,
  leaveSpace,
  muteParticipant,
  endSpace,
  rejectRequest,
  approveRequest,
  fetchUserById,
  requestToSpeak,
  approveJoinRequest,
  rejectJoinRequest,
} from "../api";
import { Space, ParticipantData } from "../types";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaSignOutAlt,
  FaUserSlash,
  FaCheck,
  FaTimes,
  FaArrowLeft,
  FaPowerOff,
  FaUsers,
  FaEye,
  FaCheckCircle,
  FaClock,
  FaFlagCheckered,
  FaConnectdevelop,
} from "react-icons/fa";
import Spinner from "./Spinner";
import Modal from "./Modal";
import "../styles/SpaceDetails.css";
import ParticipantCard from "./ParticipantCard";

export const SpaceDetails: React.FC = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const [space, setSpace] = useState<Space | undefined>();
  const [currentUser, setCurrentUser] = useState<ParticipantData | undefined>(
    undefined
  );
  const [isLoading, setIsLoading] = useState(true);
  const [canSpeak, setCanSpeak] = useState(
    currentUser !== undefined &&
      (currentUser?.role === "speaker" ||
        currentUser?.role === "host" ||
        !space?.askToSpeak)
  );
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [showSpeakRequests, setShowSpeakRequests] = useState(false);
  const [message, setMessage] = useState("");
  const [alertedRemainingTime, setAlertedRemainingTime] = useState(false);

  // Determine if the current user has been rejected from speaking
  const hasRejectedSpeakRequest = space?.askToSpeakHistory.includes(
    currentUser?.id || ""
  );

  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [banned, setBanned] = useState<boolean>(false);

  const now = Date.now();
  const ended = space?.endedAt !== 0 || !space?.active;
  const scheduled = now < space?.startedAt!;
  const remainingTime = space?.duration
    ? space?.startedAt + space?.duration - now
    : 0;
  const totalDuration = space?.duration || 1; 
  const progress = Math.max(
    0,
    Math.min((1 - remainingTime / totalDuration) * 100, 100)
  );

  const isHost = currentUser?.id === space?.host;
  const canJoinNow =
    space?.startedAt! - now <= 5 * 60 * 1000 && space?.active && !ended;

  useEffect(() => {
    (async () => {
      const uid = localStorage.getItem("currentUserId");
      if (!uid) {
        navigate("/welcome"); 
        return;
      }

      try {
        const s = await fetchSpaceById(spaceId!);
        if (!s) {
          navigate("/"); 
          return;
        }
        setSpace(s);

        const p = s.participants.find((part) => part.id === uid);

        //canSpeak
        if (p?.role === "speaker" && !canSpeak) {
          setMessage("You have been granted speaker role.");
          setCanSpeak(true);
        }
        setCurrentUser(p);
      } catch (error) {
        console.error("Error fetching space:", error);
        navigate("/");
      } finally {
        setIsLoading(false); 
      }
    })();
  }, [spaceId, navigate, canSpeak]);

  async function loadSpace() {
    const newSpace = await fetchSpaceById(spaceId!);
    if (newSpace) {
      setSpace(newSpace);
      const currentUserId = localStorage.getItem("currentUserId");
      if (currentUserId) {
        const p = newSpace.participants.find(
          (part) => part.id === currentUserId
        );
        if (p) setCurrentUser(p);
      }
    }
  }

  useEffect(() => {
    loadSpace();
    const interval = setInterval(loadSpace, 1000); 
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (message) {
      setTimeout(() => {
        setMessage("");
      }, 4000);
    }
  }, [message]);

  useEffect(() => {
    if (space?.duration) {
      const now = Date.now();
      const remainingTime = space?.startedAt + space?.duration - now;
      if (remainingTime < 0) {
        setMessage("Space has ended.");
        endSpace(spaceId!);
        setTimeout(() => {
          navigate("/");
        }, 500);
      } else if (remainingTime < 60000 && !alertedRemainingTime) {
        setMessage("Space will end in less than a minute.");
        setAlertedRemainingTime(true);
      }
    }

    if (space?.endedAt && space?.endedAt !== 0) {
      setMessage("Space has ended.");
      setTimeout(() => {
        navigate("/");
      }, 500);
    }

    if (space?.banned && space?.banned.includes(currentUser?.id!)) {
      setBanned(true);
      setMessage("You have been banned from this space.");
      handleLeave();
      setTimeout(async () => {
        await leaveSpace(spaceId!, currentUser?.id!);
        navigate("/");
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, space, spaceId, alertedRemainingTime, currentUser]);

  useEffect(() => {
    if (
      currentUser &&
      (currentUser.role === "speaker" ||
        currentUser.role === "host" ||
        !space?.askToSpeak) &&
      !canSpeak
    ) {
      setCanSpeak(true);
    }
  }, [currentUser, canSpeak, space]);

  if (isLoading) {
    return <Spinner />;
  }

  if (!space) {
    return <div>Space not found. Redirecting...</div>; // Fallback in case of redirection failure
  }

  async function handleJoin() {
    const currentUserId = localStorage.getItem("currentUserId");
    if (!currentUserId) return;
    const user = await fetchUserById(currentUserId);
    if (!user) return;
    if (banned || space?.banned?.includes(user.id)) {
      setMessage("You have been banned from this space.");
      return;
    }

    if (
      space?.askToJoin &&
      !(isHost || space?.approvedToJoin.includes(user.id))
    ) {
      // Handle join requests
      const existingRequest = space?.askToJoinQueue.includes(user.id);
      if (existingRequest) {
        setMessage("Your request to join is pending approval by the host.");
        return;
      } else {
        const existingHistory = space?.rejectedSpeakers.includes(user.id);
        if (existingHistory) {
          setMessage("Your request to join was rejected by the host.");
          return;
        }
      }

      await joinSpace(space?.id, user, !space?.askToSpeak);
      const updated = await fetchSpaceById(space?.id);
      if (updated) {
        setSpace(updated);
        const p = updated.participants.find(
          (part) => part.id === currentUserId
        );
        if (p) setCurrentUser(p);
        setMessage(
          "Your request to join has been sent and is pending approval."
        );
      }
    } else {
      // Directly join
      await joinSpace(space?.id!, user, !space?.askToSpeak);
      const updated = await fetchSpaceById(space?.id!);
      if (updated) {
        setSpace(updated);
        const p = updated.participants.find(
          (part) => part.id === currentUserId
        );
        if (p) setCurrentUser(p);
      }
    }
  }

  async function handleLeave() {
    if (currentUser) {
      await leaveSpace(space?.id!, currentUser.id);
      navigate("/");
    }
  }

  async function handleMuteParticipant(targetId: string) {
    await muteParticipant(space?.id!, targetId, true);
    const updated = await fetchSpaceById(space?.id!);
    if (updated) setSpace(updated);
  }

  async function handleEndSpace() {
    if (isHost) {
      await endSpace(space?.id!);
      const updated = await fetchSpaceById(space?.id!);
      if (updated) setSpace(updated);
      setTimeout(() => {
        navigate("/");
      }, 1000);
    }
  }

  async function handleRemoveParticipant(targetId: string) {
    if (isHost) {
      const updated = await fetchSpaceById(space?.id!);
      if (updated) setSpace(updated);
    }
  }

  async function handleToggleMic() {
    if (
      currentUser?.role === "speaker" ||
      currentUser?.role === "host" ||
      !space?.askToSpeak
    ) {
     
    } else {
      setMessage("You do not have permission to toggle your mic.");
    }
  }

  // Function to check speak request status
  function checkRequestToSpeak() {
    if (hasRejectedSpeakRequest) {
      setMessage("You have been rejected from speaking in this space.");
      return;
    }

    const isPending = space?.askToSpeakQueue.includes(currentUser?.id!);
    if (isPending) {
      setMessage("Your request to speak is pending approval by the host.");
      return;
    } else if (space?.rejectedSpeakers.includes(currentUser?.id!)) {
      setMessage("Your request to speak was rejected by the host.");
      return;
    }
    // If not pending and not rejected, allow to request
    requestToSpeak(space?.id!, currentUser?.id!)
      .then(() => {
        setMessage(
          "Your request to speak has been sent and is pending approval."
        );
        loadSpace();
      })
      .catch((error) => {
        setMessage("Error requesting to speak. Please try again.");
      });
  }

  // Function to manage join requests via modal
  const handleApproveJoin = async (userId: string) => {
    await approveJoinRequest(space?.id, userId, false); // Approve as listener
    loadSpace();
  };

  const handleRejectJoin = async (userId: string) => {
    await rejectJoinRequest(space?.id, userId);
    loadSpace();
  };

  // Function to manage speak requests via modal
  const handleApproveSpeak = async (userId: string) => {
    await approveRequest(space?.id, userId, true); // Approve as speaker
    loadSpace();
  };

  const handleRejectSpeak = async (userId: string) => {
    await rejectRequest(space?.id, userId);
    loadSpace();
  };

  // Function to get counts of speakers and listeners
  function getCounts(space: Space) {
    const speakers = space?.speakers.length;
    const listeners = space?.listeners.length;
    // add the host as a speaker
    if (space?.host && !space?.speakers.includes(space?.host)) {
      return { speakers: speakers + 1, listeners };
    }

    return { speakers, listeners };
  }

  const { speakers, listeners } = getCounts(space);

  return (
    <div className="space-details-container container">
      {/* Header with Back and End Space Buttons */}
      <div className="space-header">
        <button className="back-button" onClick={() => navigate("/")}>
          <FaArrowLeft className="icon" />
          Back
        </button>
        {currentUser && space?.active && !ended && (
          <div className="audio-controls">
            <div className="status-indicator">
              <div
                className={`connection-status ${
                  isConnected ? "connected" : "disconnected"
                }`}
                title={isConnected ? "Connected" : "Disconnected"}
              ></div>
            </div>

            {isConnected ? (
              canSpeak ? (
                <>
                  <div className="mic-controls">
                    <button
                      className="toggle-mic-btn"
                      onClick={handleToggleMic}
                      aria-label={isMuted ? "Turn on" : "Turn off"}
                    >
                      {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}{" "}
                      {isMuted ? "Turn on" : "Turn off"} Mic
                    </button>
                  </div>
                </>
              ) : (
                <button
                  className="request-speak-btn"
                  onClick={checkRequestToSpeak}
                >
                  <FaMicrophoneSlash /> Request to Speak
                </button>
              )
            ) : (
              <button
                className="connect-btn"
                onClick={() => {
                  /* Not yet implemented */
                  setMessage("This feature is not yet implemented.");
                }}
              >
                <FaConnectdevelop /> Connect Audio
              </button>
            )}
            {isHost && space?.active ? (
              <button className="end-space-button" onClick={handleEndSpace}>
                <FaPowerOff className="icon" />
                End Space
              </button>
            ) : (
              <button className="leave-button" onClick={handleLeave}>
                <FaSignOutAlt /> Leave
              </button>
            )}
          </div>
        )}
        {/* Join and Speak Controls */}
        {!currentUser && space?.active && canJoinNow && !ended && (
          <button className="join-button" onClick={handleJoin}>
            <FaCheckCircle /> Join
          </button>
        )}
      </div>

      {message && <div className="error-message">{message}</div>}
      {/* Space Information */}
      <div className="space-info">
        <h2 className="space-title">{space?.title}</h2>
        <p className="space-description">{space?.description}</p>
        <div className="space-status-icons">
          {ended && (
            <div className="status-icon ended">
              <FaFlagCheckered /> Ended
            </div>
          )}
          {scheduled && !ended && (
            <div className="status-icon scheduled">
              <FaClock /> Scheduled
            </div>
          )}
          {!scheduled && space?.active && !ended && (
            <div className="status-icon live">
              <FaCheckCircle /> Live Now
            </div>
          )}
        </div>
        {/* Viewer and Listener Counts */}
        <div className="space-counts">
          <span>
            <FaUsers /> {speakers} Speakers
          </span>
          <span>
            <FaEye /> {listeners} Listeners
          </span>
        </div>
        {/* Progress Bar */}
        {space?.active && !ended && (
          <div className="progress-bar">
            <div className="progress" style={{ width: `${progress}%` }}></div>
          </div>
        )}

        {isHost && (space?.askToJoin || space?.askToSpeak) && !ended && (
          <div className="request-buttons">
            {space?.askToJoin && (
              <button
                className="manage-request-btn"
                onClick={() => setShowJoinRequests(true)}
              >
                <FaUserSlash /> Join Requests
                <span className="pill">
                  {space?.askToJoinQueue.length > 0
                    ? space?.askToJoinQueue.length
                    : ""}
                </span>
              </button>
            )}
            {space?.askToSpeak && (
              <button
                className="manage-request-btn"
                onClick={() => setShowSpeakRequests(true)}
              >
                <FaMicrophone /> Speak Requests
                <span className="pill">
                  {space?.askToSpeakQueue.length > 0
                    ? space?.askToSpeakQueue.length
                    : ""}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Join Requests Modal */}
      <Modal
        isOpen={showJoinRequests}
        onClose={() => setShowJoinRequests(false)}
        title="Join Requests"
      >
        {space?.askToJoinQueue.length === 0 ? (
          <p>No join requests.</p>
        ) : (
          space?.askToJoinQueue.map((id) => {
            const user = space?.participants.find((p) => p.id === id);
            return (
              <div key={id} className="request-card">
                <span>{user?.displayName || id}</span>
                <div>
                  <button
                    className="accept-btn"
                    onClick={() => handleApproveJoin(id)}
                    title="Approve Join"
                  >
                    <FaCheck />
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() => handleRejectJoin(id)}
                    title="Reject Join"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </Modal>

      {/* Speak Requests Modal */}
      <Modal
        isOpen={showSpeakRequests}
        onClose={() => setShowSpeakRequests(false)}
        title="Speak Requests"
      >
        {space?.askToSpeakQueue.length === 0 ? (
          <p>No speak requests.</p>
        ) : (
          space?.askToSpeakQueue.map((id) => {
            const user = space?.participants.find((p) => p.id === id);
            return (
              <div key={id} className="request-card">
                <span>{user?.displayName || id}</span>
                <div>
                  <button
                    className="accept-btn"
                    onClick={() => handleApproveSpeak(id)}
                    title="Approve Speak"
                  >
                    <FaCheck />
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() => handleRejectSpeak(id)}
                    title="Reject Speak"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </Modal>

      {/* Participant Grid */}
      <div className="participants-section">
        <h3>Participants</h3>
        <div className="participants-grid">
          {space?.participants.map((p) => {
            return (
              <ParticipantCard
                key={p.id}
                participant={p}
                isHost={isHost || false}
                currentUserId={currentUser?.id}
                onMute={(id) => {
                  handleMuteParticipant(id);
                }}
                onToggleMic={(part) => {
                  if (part.id === currentUser?.id && part.role === "speaker") {
                    handleToggleMic();
                  }
                }}
                onRemove={(id) => {
                  if (isHost) {
                    handleRemoveParticipant(id);
                  }
                }}
                space={space}
              />
            );
          })}
        </div>
      </div>

    </div>
  );
};
