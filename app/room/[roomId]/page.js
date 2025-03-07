'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ChatBox from '../../components/ChatBox';
import VideoControls from '../../components/VideoControls';
import * as webrtcUtils from '../../lib/webrtc';
import signalingService from '../../lib/signaling';

export default function RoomWithId({ params }) {
  const { roomId } = params;
  const router = useRouter();
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [participants, setParticipants] = useState(1); // Start with just the local user
  const [isConnected, setIsConnected] = useState(false);
  const [copyLinkText, setCopyLinkText] = useState('Copy Link');
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const signalingRef = useRef(null);
  
  useEffect(() => {
    // Initialize media and WebRTC
    const init = async () => {
      try {
        await initializeMedia();
        setupWebRTC();
      } catch (error) {
        console.error('Error initializing room:', error);
      }
    };
    
    init();
    
    // Cleanup function
    return () => {
      cleanupResources();
    };
  }, [roomId]);
  
  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  };
  
  const setupWebRTC = () => {
    // Create RTCPeerConnection
    peerConnectionRef.current = webrtcUtils.createPeerConnection();
    
    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      webrtcUtils.addMediaStream(peerConnectionRef.current, localStreamRef.current);
    }
    
    // Set up event handlers for peer connection
    peerConnectionRef.current.ontrack = (event) => {
      console.log('Remote track received:', event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setIsConnected(true);
        setParticipants(2);
      }
    };
    
    // Set up signaling
    signalingRef.current = signalingService.joinRoom(roomId, {
      onRoomJoined: (roomId) => {
        console.log(`Successfully joined room: ${roomId}`);
        // If we're the first one in the room, we'll need to wait for others
        // Otherwise, we'll create an offer
        createOffer();
      },
      
      onOffer: async (offer) => {
        console.log('Received offer:', offer);
        try {
          const answer = await webrtcUtils.createAnswer(peerConnectionRef.current, offer);
          signalingRef.current.sendAnswer(answer);
        } catch (error) {
          console.error('Error creating answer:', error);
        }
      },
      
      onAnswer: async (answer) => {
        console.log('Received answer:', answer);
        try {
          await webrtcUtils.addAnswer(peerConnectionRef.current, answer);
        } catch (error) {
          console.error('Error adding answer:', error);
        }
      },
      
      onIceCandidate: async (candidate) => {
        console.log('Received ICE candidate:', candidate);
        try {
          await webrtcUtils.addIceCandidate(peerConnectionRef.current, candidate);
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      },
      
      onMessage: (message) => {
        console.log('Received message:', message);
        const newMessage = {
          ...message,
          sender: 'Remote User',
          time: new Date().toLocaleTimeString()
        };
        setMessages(prevMessages => [...prevMessages, newMessage]);
      }
    });
    
    // Set up ICE candidate handler
    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        signalingRef.current.sendIceCandidate(event.candidate);
      }
    };
  };
  
  const createOffer = async () => {
    try {
      const offer = await webrtcUtils.createOffer(peerConnectionRef.current);
      signalingRef.current.sendOffer(offer);
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  };
  
  const cleanupResources = () => {
    // Stop all media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    // Leave signaling room
    if (signalingRef.current) {
      signalingRef.current.leaveRoom();
    }
  };
  
  const handleToggleCamera = () => {
    if (localStreamRef.current) {
      const newState = webrtcUtils.toggleCamera(localStreamRef.current);
      setIsCameraOn(newState);
    }
  };
  
  const handleToggleMicrophone = () => {
    if (localStreamRef.current) {
      const newState = webrtcUtils.toggleMicrophone(localStreamRef.current);
      setIsMicOn(newState);
    }
  };
  
  const handleToggleScreenSharing = async () => {
    try {
      if (!isScreenSharing) {
        // Start screen sharing
        if (localStreamRef.current && peerConnectionRef.current) {
          const updatedStream = await webrtcUtils.startScreenSharing(
            peerConnectionRef.current, 
            localStreamRef.current
          );
          
          // Update video element
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = updatedStream;
          }
          
          setIsScreenSharing(true);
        }
      } else {
        // Stop screen sharing
        if (localStreamRef.current && peerConnectionRef.current) {
          const updatedStream = await webrtcUtils.stopScreenSharing(
            peerConnectionRef.current, 
            localStreamRef.current
          );
          
          // Update video element
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = updatedStream;
          }
          
          setIsScreenSharing(false);
        }
      }
    } catch (error) {
      console.error('Error toggling screen sharing:', error);
    }
  };
  
  const handleCopyRoomLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopyLinkText('Copied!');
        setTimeout(() => setCopyLinkText('Copy Link'), 2000);
      })
      .catch(err => {
        console.error('Error copying text:', err);
      });
  };
  
  const handleLeaveRoom = () => {
    cleanupResources();
    router.push('/');
  };
  
  const handleSendMessage = (text) => {
    if (text.trim()) {
      const message = {
        text,
        sender: 'You',
        time: new Date().toLocaleTimeString()
      };
      
      setMessages(prevMessages => [...prevMessages, message]);
      
      // Send the message through signaling
      if (signalingRef.current) {
        signalingRef.current.sendMessage({ text });
      }
    }
  };
  
  return (
    <div className="bg-gray-100 font-sans p-5 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-5">
          <div className="flex items-center gap-5 mb-4 md:mb-0">
            <div className="text-gray-600">Room:</div>
            <div className="bg-blue-50 px-3 py-2 rounded font-mono text-sm flex items-center">
              <span className="mr-2">{roomId}</span>
              <button 
                className="text-blue-500 hover:text-blue-700"
                onClick={handleCopyRoomLink}
                title="Copy Room ID"
              >
                <span className="material-icons text-sm">content_copy</span>
              </button>
            </div>
            <div className="text-gray-600 text-sm">
              {isConnected ? 'Connected' : 'Waiting for participant...'}
              {isConnected && ` • Participants: ${participants}`}
            </div>
          </div>
          
          <VideoControls 
            isCameraOn={isCameraOn}
            isMicOn={isMicOn}
            isScreenSharing={isScreenSharing}
            onToggleCamera={handleToggleCamera}
            onToggleMic={handleToggleMicrophone}
            onToggleScreenShare={handleToggleScreenSharing}
            onCopyRoomLink={handleCopyRoomLink}
            onLeaveRoom={handleLeaveRoom}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Local video */}
          <div className="video-container local bg-black rounded-lg overflow-hidden relative aspect-video">
            <video 
              ref={localVideoRef}
              className="w-full h-full object-cover scale-x-[-1]"
              autoPlay 
              muted 
              playsInline
            />
            <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">You</div>
          </div>
          
          {/* Remote video */}
          {isConnected && (
            <div className="video-container bg-black rounded-lg overflow-hidden relative aspect-video">
              <video 
                ref={remoteVideoRef}
                className="w-full h-full object-cover"
                autoPlay 
                playsInline
              />
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">Remote User</div>
            </div>
          )}
          
          {!isConnected && (
            <div className="video-container bg-black rounded-lg overflow-hidden relative aspect-video flex items-center justify-center text-white text-lg">
              Waiting for other participant...
            </div>
          )}
        </div>
        
        <ChatBox 
          messages={messages}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}