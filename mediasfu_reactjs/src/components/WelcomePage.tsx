import React, { useEffect, useState } from "react";
import {
  fetchAvailableUsers,
  markUserAsTaken,
  createProfile,
} from "../api";
import { UserProfile } from "../types";
import { useNavigate } from "react-router-dom";
import { FaUserPlus } from "react-icons/fa";

export const WelcomePage: React.FC = () => {
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [recentUserId, setRecentUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getCurrentUsers = async () => {
      const lastUsedId = localStorage.getItem("lastUserId");
      setRecentUserId(lastUsedId);

      fetchAvailableUsers().then((users) => {
        // Ensure default avatar if missing
        const updatedUsers = users.map((u) => ({
          ...u,
          avatarUrl: u.avatarUrl || "https://www.mediasfu.com/logo192.png",
        }));
        setAvailableUsers(updatedUsers);
      });
    };

    getCurrentUsers();
    setTimeout(() => {
      getCurrentUsers();
    }, 2000);
  }, []);

  async function handleSelect(userId: string) {
    await markUserAsTaken(userId);
    localStorage.setItem("currentUserId", userId);
    navigate("/");
  }

  async function handleCreate() {
    if (!displayName.trim()) return;
    const newUser = await createProfile(
      displayName.trim(),
      avatarUrl.trim() || "https://www.mediasfu.com/logo192.png"
    );
    localStorage.setItem("currentUserId", newUser.id);
    navigate("/");
  }

  return (
    <div className="profile-selection-container main-container">
      <h1
        style={{
          textAlign: "center",
          marginBottom: "0.5em",
          fontSize: "1.8em",
        }}
      >
        Welcome to SpacesTek
      </h1>
      <p style={{ textAlign: "center", color: "#555", marginBottom: "2em" }}>
        Join immersive audio discussions. Select a profile below or create a new
        one to get started.
      </p>

      <h3>Pick a Profile</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: "1em",
        }}
      >
        {availableUsers.map((u) => (
          <div
            key={u.id}
            style={{
              background: "#fefefe",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "1em",
              cursor: "pointer",
              transition: "transform 0.2s ease",
              border: u.id === recentUserId ? "2px solid #1da1f2" : "none",
            }}
            onClick={() => handleSelect(u.id)}
            onMouseOver={(e) =>
              (e.currentTarget.style.transform = "scale(1.03)")
            }
            onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <img
              src={u.avatarUrl || "https://www.mediasfu.com/logo192.png"}
              alt={u.displayName}
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                objectFit: "cover",
                marginBottom: "0.5em",
              }}
            />
            <span style={{ fontSize: "0.9em", fontWeight: 600 }}>
              {u.displayName}
            </span>
            {u.id === recentUserId && (
              <span
                style={{
                  marginTop: "0.5em",
                  fontSize: "0.8em",
                  color: "#1da1f2",
                  fontWeight: "bold",
                }}
              >
                Recently Used
              </span>
            )}
          </div>
        ))}
      </div>

      <div
        className="create-profile-form form-container"
        style={{ marginTop: "2em" }}
      >
        <h3>
          <FaUserPlus style={{ marginRight: "0.3em" }} /> Create a New Profile
        </h3>
        <input
          type="text"
          placeholder="Display name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          style={{ marginBottom: "1em" }}
        />
        <input
          type="text"
          placeholder="Avatar URL (optional)"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          style={{ marginBottom: "1em" }}
        />
        <button style={{ width: "95%" }} onClick={handleCreate}>
          Create
        </button>
      </div>
    </div>
  );
};
