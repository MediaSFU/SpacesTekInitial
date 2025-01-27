import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert
} from "react-native";
import { FontAwesome5 as Icon } from "@expo/vector-icons";
import { approveRequest, rejectRequest } from "../api";
import { ParticipantData, Space } from "../types";
import { TapGestureHandler, State } from "react-native-gesture-handler";

interface ParticipantCardProps {
  participant: ParticipantData;
  currentUserId?: string;
  isHost: boolean;
  onMute: (id: string) => void;
  onToggleMic?: (participant: ParticipantData) => void;
  onRemove: (id: string) => void;
  space?: Space;
}

const ParticipantCard: React.FC<ParticipantCardProps> = ({
  participant,
  isHost,
  onMute,
  currentUserId,
  onToggleMic,
  onRemove,
  space,
}) => {
  const [show, setShow] = useState(false);
  const [showRemove, setShowRemove] = useState(false);

  const handleDoubleTap = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.ACTIVE) {
      if (
        participant.role === "requested" &&
        isHost &&
        !space?.rejectedSpeakers.includes(participant.id)
      ) {
        setShow(!show);
      } else if (isHost && participant.role !== "host") {
        setShowRemove(!showRemove);
      }
    }
  };

  const micIcon = participant.muted ? (
    <Icon name="microphone-slash" size={16} color="#d93025" />
  ) : (
    <Icon name="microphone" size={16} color="#1da1f2" />
  );

  const handleApprove = async () => {
    if (space) {
      try {
        await approveRequest(space.id, participant.id, true);
        setShow(false);
        Alert.alert(
          "Success",
          `${participant.displayName} has been approved as a speaker.`
        );
      } catch (error) {
        Alert.alert("Error", "Failed to approve request.");
        console.error("Approve Error:", error);
      }
    }
  };

  const handleReject = async () => {
    if (space) {
      try {
        await rejectRequest(space.id, participant.id);
        setShow(false);
        Alert.alert("Success", `${participant.displayName} has been rejected.`);
      } catch (error) {
        Alert.alert("Error", "Failed to reject request.");
        console.error("Reject Error:", error);
      }
    }
  };

  return (
    <TapGestureHandler onHandlerStateChange={handleDoubleTap} numberOfTaps={2}>
      <View style={styles.cardContainer}>
        {participant.role === "host" && (
          <Icon
            name="crown"
            size={16}
            color="#f1c40f"
            style={styles.crownIcon}
          />
        )}

        <Image
          source={{
            uri:
              participant.avatarUrl || "https://www.mediasfu.com/logo192.png",
          }}
          style={styles.avatar}
          resizeMode="cover"
        />

        <Text style={styles.participantName}>{participant.displayName}</Text>
        <Text style={[styles.participantRole, styles[participant.role]]}>
          {participant.role.charAt(0).toUpperCase() + participant.role.slice(1)}
        </Text>

        {participant.role !== "listener" &&
          !isHost && (
            <TouchableOpacity
              style={styles.audioStatus}
              onPress={() => participant.id === currentUserId && 
                onToggleMic && onToggleMic(participant)}
            >
              {micIcon}
            </TouchableOpacity>
          )}

        {show && (
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleApprove}
            >
              <Icon name="check" size={14} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={handleReject}
            >
              <Icon name="times" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {showRemove && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => onRemove(participant.id)}
          >
            <Icon name="trash" size={14} color="#fff" />
          </TouchableOpacity>
        )}

        {isHost && participant.role !== "host" && !participant.muted && (
          <TouchableOpacity
            style={styles.muteOtherButton}
            onPress={() => onMute(participant.id)}
          >
            <Icon name="microphone-slash" size={14} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </TapGestureHandler>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#fff",
    width: 120,
    height: 120,
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
    marginRight: 2,
    marginBottom: 2,
  },
  crownIcon: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  avatar: {
    width: "65%",
    height: "65%",
    borderRadius: 50,
    backgroundColor: "#ccc",
  },
  videoAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    backgroundColor: "#ccc",
  },
  videoAvatarContainer: {
    width: "65%",
    height: "65%",
    borderRadius: 50,
    borderWidth: 0,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  participantName: {
    position: "absolute",
    bottom: 8,
    fontWeight: "400",
    color: "#333",
    fontSize: 14,
    textAlign: "center",
    width: "100%",
  },
  participantRole: {
    position: "absolute",
    bottom: -2,
    color: "#555",
    fontSize: 12,
    textAlign: "center",
    width: "100%",
  },
  host: {
    color: "#f1c40f",
  },
  speaker: {
    color: "#2ecc71",
  },
  listener: {
    color: "#3498db",
  },
  requested: {
    color: "#e67e22",
  },
  audioStatus: {
    position: "absolute",
    top: 8,
    left: 15,
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 4,
    borderRadius: 12,
  },
  requestActions: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    gap: 8,
    padding: 8,
  },
  acceptButton: {
    backgroundColor: "#2ecc71",
    padding: 6,
    borderRadius: 12,
  },
  rejectButton: {
    backgroundColor: "#e74c3c",
    padding: 6,
    borderRadius: 12,
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 10,
    backgroundColor: "#e74c3c",
    padding: 6,
    borderRadius: 12,
  },
  muteOtherButton: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#d93025",
    padding: 6,
    borderRadius: 12,
  },
});

export default ParticipantCard;
