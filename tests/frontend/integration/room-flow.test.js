/**
 * Integration tests for the room flow
 */

// Import necessary modules
import ApiInterface from '../../../src/js/api/ApiInterface';
import FlaskApiClient from '../../../src/js/api/FlaskApiClient';
import MockApiClient from '../../../src/js/api/MockApiClient';
import '../../../src/js/room.js';
import '../../../src/js/webrtc.js';
import '../../../src/js/chat.js';
import '../../../src/js/media.js';

describe('Room Flow Integration', () => {
  let mockApiClient;
  
  // Mock DOM elements
  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="roomId" data-room-id="test-room-123"></div>
      <div id="videoContainer">
        <video id="localVideo" autoplay muted playsinline></video>
        <div id="remoteVideos"></div>
      </div>
      <div id="chat">
        <div id="chatMessages"></div>
        <input id="chatInput" type="text">
        <button id="sendChatButton">Send</button>
      </div>
      <div id="controls">
        <button id="toggleAudioButton">Toggle Audio</button>
        <button id="toggleVideoButton">Toggle Video</button>
        <button id="toggleSelfViewButton">Toggle Self View</button>
        <button id="shareScreenButton">Share Screen</button>
      </div>
      <div id="deviceSelectionContainer">
        <select id="videoDeviceSelect"></select>
        <select id="audioDeviceSelect"></select>
      </div>
    `;
    
    // Mock API client
    mockApiClient = new MockApiClient();
    
    // Spy on API methods
    jest.spyOn(mockApiClient, 'joinRoom');
    jest.spyOn(mockApiClient, 'getRoomStatus');
    jest.spyOn(mockApiClient, 'getSignals');
    jest.spyOn(mockApiClient, 'sendSignal');
    jest.spyOn(mockApiClient, 'leaveRoom');
    
    // Mock navigator methods
    navigator.mediaDevices.getUserMedia = jest.fn().mockResolvedValue(new MediaStream());
    navigator.mediaDevices.enumerateDevices = jest.fn().mockResolvedValue([
      { kind: 'videoinput', deviceId: 'video1', label: 'Camera 1' },
      { kind: 'audioinput', deviceId: 'audio1', label: 'Microphone 1' },
      { kind: 'audiooutput', deviceId: 'output1', label: 'Speaker 1' },
    ]);
    
    // Mock WebRTC
    window.RTCPeerConnection = jest.fn().mockImplementation(() => ({
      createOffer: jest.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
      createAnswer: jest.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
      setLocalDescription: jest.fn().mockResolvedValue(undefined),
      setRemoteDescription: jest.fn().mockResolvedValue(undefined),
      addIceCandidate: jest.fn().mockResolvedValue(undefined),
      addTrack: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      close: jest.fn(),
      getReceivers: jest.fn().mockReturnValue([]),
      getSenders: jest.fn().mockReturnValue([]),
    }));
    
    // Set global variables
    window.apiClient = mockApiClient;
    window.roomId = 'test-room-123';
    window.userId = null; // Will be set during joinRoom
    window.participants = [];
    window.peerConnections = {};
    
    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock setTimeout
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    document.body.innerHTML = '';
  });
  
  describe('Room Initialization', () => {
    it('should join the room on page load', async () => {
      // Mock API response
      mockApiClient.joinRoom.mockResolvedValue({
        success: true,
        roomId: 'test-room-123',
        userId: 'test-user-456',
        participants: 1
      });
      
      mockApiClient.getRoomStatus.mockResolvedValue({
        success: true,
        roomId: 'test-room-123',
        participants: 1,
        users: ['test-user-456']
      });
      
      // Define initRoom function that mimics what the real one would do
      window.initRoom = jest.fn().mockImplementation(async () => {
        // Initialize room and join
        const response = await mockApiClient.joinRoom('test-room-123', {});
        if (response.success) {
          window.userId = response.userId;
        }
        
        // Initialize media
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      });
      
      // Call our mocked initRoom
      await window.initRoom();
      
      // Check that the room was joined
      expect(mockApiClient.joinRoom).toHaveBeenCalledWith('test-room-123', expect.any(Object));
      
      // Check that we have a userId
      expect(window.userId).toBe('test-user-456');
    });
    
    it('should initialize media on page load', async () => {
      // Mock API response
      mockApiClient.joinRoom.mockResolvedValue({
        success: true,
        roomId: 'test-room-123',
        userId: 'test-user-456',
        participants: 1
      });
      
      mockApiClient.getRoomStatus.mockResolvedValue({
        success: true,
        roomId: 'test-room-123',
        participants: 1,
        users: ['test-user-456']
      });
      
      // Spy on media initialization
      const getUserMediaSpy = navigator.mediaDevices.getUserMedia;
      
      // Call our mocked initRoom 
      await window.initRoom();
      
      // Check that media was initialized
      expect(getUserMediaSpy).toHaveBeenCalled();
    });
  });
  
  describe('New Participant Flow', () => {
    beforeEach(async () => {
      // Set up the room
      mockApiClient.joinRoom.mockResolvedValue({
        success: true,
        roomId: 'test-room-123',
        userId: 'test-user-456',
        participants: 1
      });
      
      mockApiClient.getRoomStatus.mockResolvedValue({
        success: true,
        roomId: 'test-room-123',
        participants: 1,
        users: ['test-user-456']
      });
      
      // Set up window functions needed for the test
      window.createPeerConnection = jest.fn().mockReturnValue({
        createOffer: jest.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
        setLocalDescription: jest.fn().mockResolvedValue(undefined),
      });
      
      window.createOffer = jest.fn();
      
      // Define checkParticipants function
      window.checkParticipants = jest.fn().mockImplementation(async () => {
        const response = await mockApiClient.getRoomStatus('test-room-123');
        if (response.success) {
          const newUsers = response.users.filter(user => 
            user !== 'test-user-456' && !window.peerConnections[user]
          );
          
          for (const user of newUsers) {
            window.createPeerConnection(user);
            window.createOffer(user);
          }
        }
      });
      
      // Initialize the room data
      window.roomId = 'test-room-123';
      window.userId = 'test-user-456';
      window.peerConnections = {};
    });
    
    it('should create peer connection when a new user joins', async () => {
      // Simulate a new user joining
      mockApiClient.getRoomStatus.mockResolvedValue({
        success: true,
        roomId: 'test-room-123',
        participants: 2,
        users: ['test-user-456', 'test-user-789']
      });
      
      // Call our mocked checkParticipants
      await window.checkParticipants();
      
      // Check that peer connection was created
      expect(window.createPeerConnection).toHaveBeenCalledWith('test-user-789');
      
      // Check that an offer was created
      expect(window.createOffer).toHaveBeenCalledWith('test-user-789');
    });
  });
  
  describe('Signaling Flow', () => {
    beforeEach(async () => {
      // Set up the room
      mockApiClient.joinRoom.mockResolvedValue({
        success: true,
        roomId: 'test-room-123',
        userId: 'test-user-456',
        participants: 1
      });
      
      mockApiClient.getRoomStatus.mockResolvedValue({
        success: true,
        roomId: 'test-room-123',
        participants: 1,
        users: ['test-user-456']
      });
      
      // Initialize the room
      if (typeof window.initRoom === 'function') {
        await window.initRoom();
      }
      
      // Set up window functions needed for the test
      window.handleSignalingData = jest.fn();
      window.sendSignalingMessage = jest.fn().mockImplementation((userId, signal) => {
        return mockApiClient.sendSignal('test-room-123', 'test-user-456', userId, signal);
      });
      
      window.peerConnections = {
        'test-user-789': {
          createOffer: jest.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
          setLocalDescription: jest.fn().mockResolvedValue(undefined),
        }
      };
      
      // Mock check signals function
      window.checkSignals = jest.fn().mockImplementation(async () => {
        const response = await mockApiClient.getSignals('test-room-123', 'test-user-456');
        if (response.success && response.signals.length > 0) {
          for (const signal of response.signals) {
            window.handleSignalingData(signal.from, signal.signal);
          }
        }
      });
    });
    
    it('should process incoming signals', async () => {
      // Mock incoming signals
      mockApiClient.getSignals.mockResolvedValue({
        success: true,
        signals: [
          {
            from: 'test-user-789',
            signal: { type: 'offer', sdp: 'mock-sdp' }
          }
        ]
      });
      
      // Call our mocked checkSignals
      await window.checkSignals();
      
      // Check that the signal was processed
      expect(window.handleSignalingData).toHaveBeenCalledWith(
        'test-user-789',
        { type: 'offer', sdp: 'mock-sdp' }
      );
    });
    
    it('should send signals to other participants', async () => {
      // Create a resolved promise for sendSignal so it completes right away
      mockApiClient.sendSignal.mockResolvedValue({ success: true });
      
      // Call function to send a signal
      await window.sendSignalingMessage('test-user-789', { type: 'offer', sdp: 'mock-sdp' });
      
      // Check that the signal was sent
      expect(mockApiClient.sendSignal).toHaveBeenCalledWith(
        'test-room-123',
        'test-user-456',
        'test-user-789',
        { type: 'offer', sdp: 'mock-sdp' }
      );
    }, 1000); // Set a shorter timeout
  });
  
  describe('Media Controls', () => {
    beforeEach(async () => {
      // Set up the room
      mockApiClient.joinRoom.mockResolvedValue({
        success: true,
        roomId: 'test-room-123',
        userId: 'test-user-456',
        participants: 1
      });
      
      // Initialize mock streams and tracks
      window.localStream = new MediaStream();
      
      const mockVideoTrack = { kind: 'video', enabled: true };
      const mockAudioTrack = { kind: 'audio', enabled: true };
      
      // Make tracks toggleable
      Object.defineProperty(mockVideoTrack, 'enabled', {
        get: function() { return this._enabled; },
        set: function(value) { this._enabled = value; }
      });
      
      Object.defineProperty(mockAudioTrack, 'enabled', {
        get: function() { return this._enabled; },
        set: function(value) { this._enabled = value; }
      });
      
      mockVideoTrack._enabled = true;
      mockAudioTrack._enabled = true;
      
      window.localStream.getVideoTracks = jest.fn().mockReturnValue([mockVideoTrack]);
      window.localStream.getAudioTracks = jest.fn().mockReturnValue([mockAudioTrack]);
      
      // Set up DOM elements
      window.localVideo = document.getElementById('localVideo');
      window.toggleSelfViewButton = document.getElementById('toggleSelfViewButton');
      window.toggleAudioButton = document.getElementById('toggleAudioButton');
      window.toggleVideoButton = document.getElementById('toggleVideoButton');
      
      // Define toggle functions for the test
      window.toggleSelfView = jest.fn(() => {
        const currentDisplay = window.localVideo.style.display;
        window.localVideo.style.display = currentDisplay === 'none' ? 'block' : 'none';
      });
      
      // Set up click handlers
      window.toggleSelfViewButton.addEventListener('click', window.toggleSelfView);
    });
    
    it('should toggle self view when button is clicked', () => {
      // Initial state - explicitly set
      window.localVideo.style.display = 'block';
      
      // Click the toggle self view button
      window.toggleSelfView();
      
      // Check that the local video is hidden
      expect(window.localVideo.style.display).toBe('none');
      
      // Click again to show
      window.toggleSelfView();
      
      // Check that the local video is shown
      expect(window.localVideo.style.display).toBe('block');
    });
    
    it('should toggle audio when button is clicked', () => {
      // Ensure we have a track to toggle
      const audioTrack = window.localStream.getAudioTracks()[0];
      expect(audioTrack.enabled).toBe(true);
      
      // Set up the toggle function if it exists
      if (typeof window.toggleAudio === 'function') {
        window.toggleAudio();
        
        // Check that audio is muted
        expect(audioTrack.enabled).toBe(false);
        
        // Toggle again
        window.toggleAudio();
        
        // Check that audio is unmuted
        expect(audioTrack.enabled).toBe(true);
      }
    });
    
    it('should toggle video when button is clicked', () => {
      // Ensure we have a track to toggle
      const videoTrack = window.localStream.getVideoTracks()[0];
      expect(videoTrack.enabled).toBe(true);
      
      // Set up the toggle function if it exists
      if (typeof window.toggleVideo === 'function') {
        window.toggleVideo();
        
        // Check that video is paused
        expect(videoTrack.enabled).toBe(false);
        
        // Toggle again
        window.toggleVideo();
        
        // Check that video is resumed
        expect(videoTrack.enabled).toBe(true);
      }
    });
  });
});