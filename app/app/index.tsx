import React, { useState } from "react";
import { StyleSheet, View, Clipboard, Alert } from "react-native";
import { Card, Text, Input, Button, Divider, Spinner, Layout } from "@ui-kitten/components";
import { useRouter } from "expo-router";
import { ApiProvider } from "../api/ApiProvider";
import { BackendSelector } from "../api/BackendSelector";
import { Login } from "../components/Login";

export default function HomeScreen() {
  const [roomId, setRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Initialize API provider with Firebase provider
  const initializeApiProvider = async () => {
    try {
      const provider = ApiProvider.getInstance();
      await provider.initialize('firebase');
    } catch (error) {
      console.error('Error initializing API provider:', error);
      setError('Failed to initialize API provider. Please try again.');
    }
  };

  // Initialize API on first render
  React.useEffect(() => {
    initializeApiProvider();
  }, []);

  // Create a new room
  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);

    try {
      const provider = ApiProvider.getInstance();
      const apiClient = provider.getApiClient();
      
      if (!apiClient) {
        throw new Error('API client not initialized');
      }
      
      const result = await apiClient.createRoom();
      
      // Navigate to room screen with room ID
      router.push({
        pathname: "/room/[id]",
        params: { id: result.roomId }
      });
      
    } catch (error) {
      console.error('Error creating room:', error);
      setError('Failed to create room. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Join an existing room
  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    
    // Navigate to room screen with provided room ID
    router.push({
      pathname: "/room/[id]",
      params: { id: roomId.trim() }
    });
  };

  // Handle API selection
  const handleApiSelect = (apiType) => {
    console.log(`Selected API: ${apiType}`);
  };

  return (
    <Layout style={styles.container}>
      <View style={styles.header}>
        <Text category="h4">WebRTC Video Chat</Text>
      </View>
      <View style={styles.content}>
        <Text category="h1" style={styles.title}>Create or Join Room</Text>
        
        <Card style={styles.card}>
          <Button
            appearance="filled"
            size="large"
            onPress={handleCreateRoom}
            disabled={loading}
            accessoryRight={loading ? () => <Spinner size="small" /> : undefined}
          >
            Create New Room
          </Button>
          
          <View style={styles.dividerContainer}>
            <Divider style={styles.divider} />
            <Text appearance="hint" style={styles.orText}>OR</Text>
            <Divider style={styles.divider} />
          </View>
          
          <Input
            placeholder="Enter Room ID"
            value={roomId}
            onChangeText={setRoomId}
            style={styles.input}
            autoCapitalize="none"
            disabled={loading}
          />
          
          <Button
            style={styles.joinButton}
            onPress={handleJoinRoom}
            disabled={loading || !roomId.trim()}
          >
            Join Room
          </Button>
          
          {error && (
            <Text status="danger" style={styles.errorText}>
              {error}
            </Text>
          )}
        </Card>
        
        <BackendSelector onSelect={handleApiSelect} />
        
        <Login onLoginStateChange={(isLoggedIn) => {
          console.log("Login state changed:", isLoggedIn);
        }} />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f9fc",
    paddingTop: 40, // Safe area for status bar
  },
  header: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    maxWidth: 600,
    width: "100%",
    alignSelf: "center"
  },
  title: {
    textAlign: "center",
    marginBottom: 30
  },
  card: {
    marginBottom: 20
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20
  },
  divider: {
    flex: 1
  },
  orText: {
    marginHorizontal: 10
  },
  input: {
    marginBottom: 15
  },
  joinButton: {
    marginBottom: 10
  },
  errorText: {
    marginTop: 10,
    textAlign: "center"
  }
});
