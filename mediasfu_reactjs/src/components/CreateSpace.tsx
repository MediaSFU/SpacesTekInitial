import React, { useState, useMemo } from "react";
import { createSpace, fetchUserById } from "../api";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

function generateDurations(): { label: string; value: number }[] {
  const durations: { label: string; value: number }[] = [];
  const msPerMin = 60000;
  for (let m = 15; m <= 180; m += 15) {
    durations.push({ label: `${m} min`, value: m * msPerMin });
  }
  for (let h = 4; h <= 6; h++) {
    durations.push({ label: `${h} hr`, value: h * 60 * msPerMin });
  }
  return durations;
}

export const CreateSpace: React.FC = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState(25);
  const [askToSpeak, setAskToSpeak] = useState(false);
  const [askToJoin, setAskToJoin] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [error, setError] = useState("");
  const [duration, setDuration] = useState<number>(15 * 60 * 1000);

  const navigate = useNavigate();
  const durations = useMemo(() => generateDurations(), []);

  async function handleCreate() {
    const currentUserId = localStorage.getItem("currentUserId");
    if (!currentUserId) {
      navigate("/welcome");
      return;
    }
    const currentUser = await fetchUserById(currentUserId);
    if (!currentUser) return;

    let startTimestamp = Date.now();
    if (startTime) {
      const chosenTime = new Date(startTime).getTime();
      const diff = chosenTime - Date.now();
      const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
      if (diff > threeDaysMs || diff < 0) {
        setError(
          "Scheduled time must be within the next 3 days, and not in the past."
        );
        return;
      }
      startTimestamp = chosenTime;
    }

    // Validation
    if (title.length < 3) {
      setError("Title must be at least 3 characters");
      return;
    }
    if (description.length < 10) {
      setError("Description must be at least 10 characters");
      return;
    }

    const newSpace = await createSpace(title, description, currentUser, {
      capacity,
      askToSpeak,
      askToJoin,
      startTime: startTimestamp,
      duration,
    });
    navigate(`/space/${newSpace.id}`);
  }

  React.useEffect(() => {
    const timeout = setTimeout(() => setError(''), 3000);
    return () => clearTimeout(timeout);
  }, [error]);

  return (
    <div className="create-space-container container">
      <div className="create-space-header">
        <button className="back-button" onClick={() => navigate("/")}>
          <FaArrowLeft className="icon" /> Cancel
        </button>
        <h2>Create a New Space</h2>
      </div>
      <div className="form-container">
        {error && (
          <div style={{ color: "red", marginBottom: "1em" }}>{error}</div>
        )}

        <label>Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Evening Discussion"
        />

        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your space..."
        ></textarea>

        <label>Capacity</label>
        <input
          type="number"
          value={capacity}
          min={2}
          max={10000}
          onChange={(e) => setCapacity(Number(e.target.value))}
        />

        <div className="checkbox-group">
          <label>Ask to Speak</label>
          <input
            type="checkbox"
            checked={askToSpeak}
            onChange={(e) => setAskToSpeak(e.target.checked)}
          />
        </div>
        <hr />

        <div className="checkbox-group">
          <label>Ask to Join</label>
          <input
            type="checkbox"
            checked={askToJoin}
            onChange={(e) => setAskToJoin(e.target.checked)}
          />
        </div>
        <hr />

        <div style={{ margin: "1em 0" }}>
          <label
            style={{ display: "block", marginBottom: "0.5em", fontWeight: 600 }}
          >
            Start Time (optional)
          </label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <small
            style={{ display: "block", color: "#555", marginTop: "0.5em" }}
          >
            Leave blank for immediate start. Must be within next 3 days.
          </small>
        </div>
        <hr />

        <div style={{ margin: "1em 0" }}>
          <label>Duration</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {durations.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
          <small
            style={{ display: "block", color: "#555", marginTop: "0.5em" }}
          >
            Choose how long the space will run before automatically ending.
          </small>
        </div>
        <hr />
        {error && (
          <div style={{ color: "red", marginBottom: "1em" }}>{error}</div>
        )}
        <button style={{ marginTop: "1em" }} onClick={handleCreate}>
          Create Space
        </button>
      </div>
    </div>
  );
};
