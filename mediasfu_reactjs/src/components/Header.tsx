import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaSignOutAlt } from "react-icons/fa";
import { freeUser, fetchUserById } from "../api";
import { UserProfile } from "../types";

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUserId = localStorage.getItem("currentUserId");
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (currentUserId) {
      fetchUserById(currentUserId).then((user) => {
        if (user) {
          setCurrentUser({
            ...user,
            avatarUrl: user.avatarUrl || "https://www.mediasfu.com/logo192.png",
          });
        } else {
          localStorage.removeItem("currentUserId");
          navigate("/welcome");
        }
      });
    }
  }, [currentUserId, navigate]);

  function handleLogout() {
    if (currentUserId) {
      freeUser(currentUserId);
    }
    localStorage.setItem("lastUserId", currentUserId || "");
    localStorage.removeItem("currentUserId");
    navigate("/welcome");
  }

  return (
    <header
      className="main-container"
      style={{
        padding: "1em",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#fff",
        borderBottom: "1px solid #eee",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          fontWeight: "bold",
          fontSize: "1.2em",
          cursor: "pointer",
        }}
        onClick={() => navigate("/")}
      >
        SpacesTek
      </div>

      {currentUser && location.pathname !== "/welcome" && (
        <div style={{ display: "flex", alignItems: "center", gap: "1em" }}>
          {/* User Info */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5em" }}>
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.displayName}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
            <span
              style={{ fontWeight: "600", fontSize: "0.9em", color: "#333" }}
            >
              {currentUser.displayName}
            </span>
          </div>

          {/* Logout Button */}
          <button
            style={{
              background: "transparent",
              color: "#1da1f2",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              fontSize: "0.9em",
            }}
            onClick={handleLogout}
          >
            <FaSignOutAlt style={{ marginRight: "0.3em" }} /> Logout
          </button>
        </div>
      )}
    </header>
  );
};
