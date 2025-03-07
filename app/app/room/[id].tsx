import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Alert, Clipboard, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Layout, Text, Card, Button, Icon, IconProps, Spinner } from '@ui-kitten/components';

// Import components
import { VideoGrid } from '../../components/VideoGrid';
import { ChatInterface } from '../../components/ChatInterface';
import { MediaControls } from '../../components/MediaControls';
import { DeviceSettings } from '../../components/DeviceSettings';

// Import services
import { ApiProvider } from '../../api/ApiProvider';
import { MediaManager } from '../../services/media';
import { WebRTCManager } from '../../services/webrtc';
import { SignalingService } from '../../services/signaling';
import { ChatManager, ChatMessage } from '../../services/chat';

export default function RoomScreen() {
  const { id: roomId } = useLocalSearchParams();
  const router = useRouter();
  
  // State for managing room
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // State for media controls
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // State for media streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [screenShareStream, setScreenShareStream] = useState<MediaStream | null>(null);
  
  // State for device selection
  const [audioInputDevices, setAudioInputDevices] = useState<any[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<any[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<any[]>([]);
  
  // State for chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatReady, setChatReady] = useState(false);
  
  // Service references
  const mediaManager = useRef<MediaManager | null>(null);
  const webrtcManager = useRef<WebRTCManager | null>(null);
  const signalingService = useRef<SignalingService | null>(null);
  const chatManager = useRef<ChatManager | null>(null);

  // Initialize all services and join room
  useEffect(() => {
    if (!roomId) {
      setError('Invalid room ID');
      setLoading(false);
      return;
    }
    
    const initializeRoom = async () => {
      try {
        console.log('[Room] Starting room initialization');
        
        // Get API provider
        const provider = ApiProvider.getInstance();
        const apiClient = provider.getApiClient();
        
        console.log('[Room] API provider type:', provider.getApiType());
        
        if (!apiClient) {
          throw new Error('API client not initialized');
        }
        
        // Check auth status if using Firebase
        if (apiClient.getProviderName() === 'Firebase' && apiClient.getCurrentUser) {
          const user = apiClient.getCurrentUser();
          console.log('[Room] Current user:', user ? `${user.displayName} (${user.uid})` : 'Not signed in');
        }
        
        // Initialize media
        console.log('[Room] Initializing media');
        mediaManager.current = new MediaManager();
        const stream = await mediaManager.current.initialize({ video: true, audio: true });
        setLocalStream(stream);
        console.log('[Room] Media initialized, got stream:', stream ? 'yes' : 'no');
        
        // Get device lists
        console.log('[Room] Enumerating devices');
        const devices = await mediaManager.current.enumerateDevices();
        setAudioInputDevices(mediaManager.current.getAudioInputDevices());
        setVideoInputDevices(mediaManager.current.getVideoInputDevices());
        setAudioOutputDevices(mediaManager.current.getAudioOutputDevices());
        console.log('[Room] Found devices:', 
          'audio:', mediaManager.current.getAudioInputDevices().length,
          'video:', mediaManager.current.getVideoInputDevices().length);
        
        // Initialize WebRTC
        console.log('[Room] Initializing WebRTC');
        webrtcManager.current = new WebRTCManager();
        await webrtcManager.current.initialize(stream);
        console.log('[Room] WebRTC initialized');
        
        // Setup WebRTC callbacks for handling remote streams
        webrtcManager.current.setOnTrack((stream, peerId) => {
          console.log('[Room] Received remote stream from peer:', peerId);
          setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.set(peerId, stream);
            return newStreams;
          });
        });
        
        // Initialize signaling
        console.log('[Room] Initializing signaling service');
        signalingService.current = new SignalingService(apiClient);
        
        // Join room
        console.log('[Room] Joining room:', roomId);
        const newUserId = await signalingService.current.joinRoom(roomId as string);
        setUserId(newUserId);
        console.log('[Room] Joined room with user ID:', newUserId);
        
        // Initialize chat manager
        console.log('[Room] Initializing chat manager');
        chatManager.current = new ChatManager(newUserId, webrtcManager.current);
        chatManager.current.initialize(true); // Initialize as initiator
        
        // Setup chat message handler
        chatManager.current.onMessage(message => {
          console.log('[Room] Received chat message from:', message.sender);
          setChatMessages(prev => [...prev, message]);
        });
        
        setChatReady(true);
        setConnected(true);
        
        // Setup signaling handlers
        console.log('[Room] Setting up signaling handlers');
        setupSignalingHandlers();
        console.log('[Room] Room initialization complete');
        
      } catch (error) {
        console.error('[Room] Error initializing room:', error);
        setError(`Failed to join the room: ${error.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    initializeRoom();
    
    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [roomId]);
  
  // Setup signaling handlers for WebRTC
  const setupSignalingHandlers = () => {
    if (!signalingService.current || !webrtcManager.current) return;
    
    // Handle WebRTC offer
    signalingService.current.on('webrtc-offer', async (message) => {
      try {
        if (!webrtcManager.current) return;
        
        const answer = await webrtcManager.current.processOffer(message.data);
        
        // Send answer back
        await signalingService.current?.sendMessage('webrtc-answer', answer, message.sender);
      } catch (error) {
        console.error('Error processing offer:', error);
      }
    });
    
    // Handle WebRTC answer
    signalingService.current.on('webrtc-answer', async (message) => {
      try {
        if (!webrtcManager.current) return;
        
        await webrtcManager.current.processAnswer(message.data);
      } catch (error) {
        console.error('Error processing answer:', error);
      }
    });
    
    // Handle ICE candidates
    signalingService.current.on('ice-candidate', async (message) => {
      try {
        if (!webrtcManager.current) return;
        
        await webrtcManager.current.addIceCandidate(message.data);
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    });
    
    // Handle user joined event
    signalingService.current.on('user-joined', async (message) => {
      try {
        if (!webrtcManager.current) return;
        
        // Create and send offer to the new user
        const offer = await webrtcManager.current.createOffer();
        await signalingService.current?.sendMessage('webrtc-offer', offer, message.sender);
      } catch (error) {
        console.error('Error creating offer:', error);
      }
    });
    
    // Handle user left event
    signalingService.current.on('user-left', (message) => {
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        // Remove streams from the user who left
        // In a real implementation, we would have a mapping of userId to peerId
        return newStreams;
      });
    });
    
    // Setup ICE candidate handler
    webrtcManager.current.setOnIceCandidate(async (candidate) => {
      await signalingService.current?.sendMessage('ice-candidate', candidate);
    });
  };
  
  // Handle send chat message
  const handleSendMessage = (content: string) => {
    if (!chatManager.current) return;
    
    chatManager.current.sendMessage(content);
  };
  
  // Handle toggle audio
  const handleToggleAudio = () => {
    if (!mediaManager.current) return;
    
    const newState = mediaManager.current.toggleAudio();
    setAudioEnabled(newState);
  };
  
  // Handle toggle video
  const handleToggleVideo = () => {
    if (!mediaManager.current) return;
    
    const newState = mediaManager.current.toggleVideo();
    setVideoEnabled(newState);
  };
  
  // Handle screen sharing
  const handleShareScreen = async () => {
    if (!mediaManager.current || !webrtcManager.current) return;
    
    if (isScreenSharing) {
      // Stop screen sharing
      setIsScreenSharing(false);
      setScreenShareStream(null);
      
      // TODO: In a complete implementation, we would need to:
      // 1. Stop the screen share track
      // 2. Remove it from the peer connection
      // 3. Notify other participants
    } else {
      // Start screen sharing
      try {
        const stream = await mediaManager.current.getScreenShareStream();
        if (stream) {
          setScreenShareStream(stream);
          setIsScreenSharing(true);
          
          // TODO: In a complete implementation, we would need to:
          // 1. Add the screen share track to the peer connection
          // 2. Renegotiate with peers
        }
      } catch (error) {
        console.error('Error sharing screen:', error);
        Alert.alert('Screen Sharing Failed', 'Failed to start screen sharing. Please try again.');
      }
    }
  };
  
  // Handle device selection
  const handleDeviceSelection = async (audioDevice: string, videoDevice: string, audioOutputDevice: string) => {
    if (!mediaManager.current) return;
    
    // Change audio input device
    if (audioDevice && audioDevice !== mediaManager.current.getCurrentAudioDevice()) {
      await mediaManager.current.switchAudioDevice(audioDevice);
    }
    
    // Change video input device
    if (videoDevice && videoDevice !== mediaManager.current.getCurrentVideoDevice()) {
      await mediaManager.current.switchVideoDevice(videoDevice);
    }
    
    // Change audio output device (if supported)
    if (audioOutputDevice && audioOutputDevice !== mediaManager.current.getCurrentAudioOutputDevice()) {
      // Find all video elements to apply output device change
      // This is simplified - in a real implementation we would need to handle this differently
      const videoElements = document.querySelectorAll('video');
      for (const element of videoElements) {
        await mediaManager.current.switchAudioOutputDevice(audioOutputDevice, element);
      }
    }
    
    // Update local stream reference
    if (mediaManager.current) {
      setLocalStream(mediaManager.current.getStream());
    }
  };
  
  // Handle room leave
  const handleLeaveRoom = async () => {
    await cleanup();
    router.replace('/');
  };
  
  // Cleanup resources
  const cleanup = async () => {
    // Leave room via signaling
    if (signalingService.current) {
      await signalingService.current.leaveRoom();
    }
    
    // Close WebRTC connections
    if (webrtcManager.current) {
      webrtcManager.current.close();
    }
    
    // Close chat
    if (chatManager.current) {
      chatManager.current.close();
    }
    
    // Stop media
    if (mediaManager.current) {
      mediaManager.current.stop();
    }
    
    // Stop screen sharing
    if (screenShareStream) {
      screenShareStream.getTracks().forEach(track => track.stop());
      setScreenShareStream(null);
    }
  };
  
  // Copy room ID to clipboard
  const copyRoomId = () => {
    Clipboard.setString(roomId as string);
    Alert.alert('Copied', 'Room ID copied to clipboard');
  };
  
  // Render copy icon
  const renderCopyIcon = (props?: IconProps) => (
    <Icon {...props} name="copy-outline" />
  );

  if (loading) {
    return (
      <Layout style={styles.loadingContainer}>
        <Spinner size="large" />
        <Text style={styles.loadingText}>Joining room...</Text>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout style={styles.errorContainer}>
        <Text category="h5" status="danger">Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Button onPress={() => router.replace('/')}>Go Back</Button>
      </Layout>
    );
  }

  return (
    <Layout style={styles.container}>
      <View style={styles.headerContainer}>
        <Text category="h6">Room: {roomId}</Text>
        <Button
          size="small"
          appearance="ghost"
          accessoryLeft={renderCopyIcon}
          onPress={copyRoomId}
        />
      </View>
      
      <View style={styles.gridContainer}>
        <VideoGrid
          localStream={localStream}
          remoteStreams={remoteStreams}
          screenShareStream={screenShareStream}
        />
      </View>
      
      <MediaControls
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onShareScreen={handleShareScreen}
        onOpenSettings={() => setShowSettings(true)}
        onLeaveRoom={handleLeaveRoom}
        isScreenSharing={isScreenSharing}
      />
      
      <ChatInterface
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isReady={chatReady}
      />
      
      <DeviceSettings
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        onApply={handleDeviceSelection}
        audioInputDevices={audioInputDevices}
        videoInputDevices={videoInputDevices}
        audioOutputDevices={audioOutputDevices}
        currentAudioDevice={mediaManager.current?.getCurrentAudioDevice() || null}
        currentVideoDevice={mediaManager.current?.getCurrentVideoDevice() || null}
        currentAudioOutputDevice={mediaManager.current?.getCurrentAudioOutputDevice() || null}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40, // Add safe area padding for status bar
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
    marginVertical: 20,
  },
  gridContainer: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
  },
  roomIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomIdText: {
    marginRight: 10,
  },
});