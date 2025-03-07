'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function Room() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  
  useEffect(() => {
    // Generate a random room ID if not provided in the URL
    const generatedRoomId = Math.random().toString(36).substring(2, 8);
    setRoomId(generatedRoomId);
    
    // Initialize camera and microphone
    initializeMedia();
    
    // Set up signaling and WebRTC
    setupWebRTC();
    
    return () => {
      // Clean up resources when component unmounts
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, []);
  
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
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };
  
  const setupWebRTC = () => {
    // This would be implemented with actual WebRTC setup code
    // Including creating RTCPeerConnection, adding tracks, etc.
    console.log('Setting up WebRTC');
  };
  
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOn(videoTrack.enabled);
      }
    }
  };
  
  const toggleMicrophone = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };
  
  const toggleScreenSharing = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        
        const videoTrack = screenStream.getVideoTracks()[0];
        
        // Replace video track in local stream and peer connection
        if (localStreamRef.current) {
          const sender = peerConnectionRef.current.getSenders().find(s => 
            s.track.kind === videoTrack.kind
          );
          
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
          
          // Update local video display
          const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
          localStreamRef.current.removeTrack(oldVideoTrack);
          localStreamRef.current.addTrack(videoTrack);
          
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
          
          setIsScreenSharing(true);
          
          // Listen for the end of screen sharing
          videoTrack.onended = () => {
            stopScreenSharing();
          };
        }
      } catch (error) {
        console.error('Error starting screen sharing:', error);
      }
    } else {
      stopScreenSharing();
    }
  };
  
  const stopScreenSharing = async () => {
    try {
      // Get a new video track from the camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = stream.getVideoTracks()[0];
      
      // Replace the screen sharing track with the camera track
      if (localStreamRef.current && peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s =>
          s.track.kind === 'video'
        );
        
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
        
        // Update local video display
        const oldVideoTrack = localStreamRef.current.getVideoTracks()[0];
        oldVideoTrack.stop();
        localStreamRef.current.removeTrack(oldVideoTrack);
        localStreamRef.current.addTrack(videoTrack);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
      
      setIsScreenSharing(false);
    } catch (error) {
      console.error('Error stopping screen sharing:', error);
    }
  };
  
  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        text: newMessage,
        sender: 'You',
        time: new Date().toLocaleTimeString()
      };
      
      setMessages([...messages, message]);
      setNewMessage('');
      
      // In a real application, you would also send this message through your
      // signaling channel to the remote peer
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Room: {roomId}</h1>
          <button 
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            onClick={() => router.push('/')}
          >
            Leave Room
          </button>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto p-4 flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex flex-col gap-4">
          <div className="relative bg-black rounded-lg overflow-hidden h-3/4">
            <video 
              ref={remoteVideoRef}
              className="w-full h-full object-contain"
              autoPlay 
              playsInline
            />
            <div className="absolute bottom-4 right-4 w-1/4 h-1/4 bg-gray-800 rounded-lg overflow-hidden border-2 border-white">
              <video 
                ref={localVideoRef}
                className="w-full h-full object-contain"
                autoPlay 
                muted 
                playsInline
              />
            </div>
          </div>
          
          <div className="flex justify-center gap-4 p-4 bg-white rounded-lg shadow">
            <button 
              className={`p-3 rounded-full ${isMicOn ? 'bg-blue-500' : 'bg-red-500'} text-white`}
              onClick={toggleMicrophone}
            >
              {isMicOn ? 'Mic On' : 'Mic Off'}
            </button>
            <button 
              className={`p-3 rounded-full ${isCameraOn ? 'bg-blue-500' : 'bg-red-500'} text-white`}
              onClick={toggleCamera}
            >
              {isCameraOn ? 'Camera On' : 'Camera Off'}
            </button>
            <button 
              className={`p-3 rounded-full ${isScreenSharing ? 'bg-green-500' : 'bg-blue-500'} text-white`}
              onClick={toggleScreenSharing}
            >
              {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            </button>
          </div>
        </div>
        
        <div className="w-full md:w-80 bg-white rounded-lg shadow flex flex-col">
          <div className="p-3 bg-gray-200 rounded-t-lg">
            <h2 className="font-bold">Chat</h2>
          </div>
          
          <div className="flex-1 p-3 overflow-y-auto">
            {messages.map((message, index) => (
              <div key={index} className="mb-2">
                <div className="font-bold">{message.sender} <span className="text-xs text-gray-500">{message.time}</span></div>
                <div className="bg-gray-100 p-2 rounded">{message.text}</div>
              </div>
            ))}
          </div>
          
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 p-2 border rounded"
                placeholder="Type a message..."
              />
              <button 
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={sendMessage}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}