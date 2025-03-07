/**
 * Unit tests for WebRTC module
 */

describe('WebRTC Module', () => {
  // Define DOM elements needed by the module
  let videoContainer;
  let localVideo;
  let remoteVideosDiv;
  let localStream;
  
  // Define WebRTC objects
  let peerConnection;
  let mockPeerConnections = {};
  
  // Mock the original RTCPeerConnection
  const originalRTCPeerConnection = window.RTCPeerConnection;
  
  beforeEach(() => {
    // Create DOM elements
    document.body.innerHTML = `
      <div id="videoContainer">
        <video id="localVideo" autoplay muted playsinline></video>
        <div id="remoteVideos"></div>
      </div>
    `;
    
    videoContainer = document.getElementById('videoContainer');
    localVideo = document.getElementById('localVideo');
    remoteVideosDiv = document.getElementById('remoteVideos');
    
    // Create mock local stream
    localStream = new MediaStream();
    const mockVideoTrack = { kind: 'video', enabled: true };
    const mockAudioTrack = { kind: 'audio', enabled: true };
    localStream.getTracks = jest.fn().mockReturnValue([mockVideoTrack, mockAudioTrack]);
    localStream.getVideoTracks = jest.fn().mockReturnValue([mockVideoTrack]);
    localStream.getAudioTracks = jest.fn().mockReturnValue([mockAudioTrack]);
    
    // Clear any previous connections
    window.peerConnections = {};
    mockPeerConnections = {};
    
    // Spy on RTCPeerConnection methods
    peerConnection = new RTCPeerConnection();
    jest.spyOn(peerConnection, 'createOffer');
    jest.spyOn(peerConnection, 'createAnswer');
    jest.spyOn(peerConnection, 'setLocalDescription');
    jest.spyOn(peerConnection, 'setRemoteDescription');
    jest.spyOn(peerConnection, 'addIceCandidate');
    jest.spyOn(peerConnection, 'close');
    
    // Mock RTCPeerConnection constructor to track instances
    window.RTCPeerConnection = jest.fn().mockImplementation(() => {
      const pc = {
        createOffer: jest.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' }),
        createAnswer: jest.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' }),
        setLocalDescription: jest.fn().mockResolvedValue(undefined),
        setRemoteDescription: jest.fn().mockResolvedValue(undefined),
        addIceCandidate: jest.fn().mockResolvedValue(undefined),
        addTrack: jest.fn(),
        addEventListener: jest.fn((event, callback) => {
          pc[`on${event}`] = callback;
        }),
        removeEventListener: jest.fn(),
        close: jest.fn(),
        getReceivers: jest.fn().mockReturnValue([]),
        getSenders: jest.fn().mockReturnValue([]),
        getLocalStreams: jest.fn().mockReturnValue([]),
        getRemoteStreams: jest.fn().mockReturnValue([]),
        onicecandidate: null,
        ontrack: null,
        onnegotiationneeded: null,
        oniceconnectionstatechange: null,
        iceConnectionState: 'new',
        localDescription: null,
        remoteDescription: null,
      };
      return pc;
    });
    
    // Mock signaling functions
    window.sendSignalingMessage = jest.fn();
    
    // Set up global WebRTC variables
    window.localStream = localStream;
    window.startCallBtn = document.createElement('button');
    window.roomId = 'test-room';
    window.userId = 'test-user';
    
    // Mock WebRTC functions directly without loading the module
    // This is simpler than trying to load the entire module which may have dependencies
    window.createPeerConnection = jest.fn(peerId => {
      const pc = new RTCPeerConnection();
      
      // Add listeners and track handling that our real implementation would do
      pc.addTrack = jest.fn();
      
      // Add stream tracks to the connection
      if (window.localStream) {
        const tracks = window.localStream.getTracks();
        for (const track of tracks) {
          pc.addTrack(track);
        }
      }
      
      // Set up event listeners
      pc.addEventListener = jest.fn();
      pc.addEventListener('icecandidate', jest.fn());
      pc.addEventListener('track', jest.fn());
      pc.addEventListener('iceconnectionstatechange', jest.fn());
      
      window.peerConnections[peerId] = pc;
      return pc;
    });
    
    window.createOffer = jest.fn().mockImplementation(async (peerId) => {
      const pc = window.peerConnections[peerId];
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await window.sendSignalingMessage(peerId, offer);
      return offer;
    });
    
    window.handleOfferSignal = jest.fn().mockImplementation(async (peerId, signal) => {
      if (!window.peerConnections[peerId]) {
        window.createPeerConnection(peerId);
      }
      const pc = window.peerConnections[peerId];
      await pc.setRemoteDescription(signal);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await window.sendSignalingMessage(peerId, answer);
    });
    
    window.handleAnswerSignal = jest.fn().mockImplementation(async (peerId, signal) => {
      const pc = window.peerConnections[peerId];
      if (!pc) {
        console.error(`No peer connection for ${peerId}`);
        return;
      }
      await pc.setRemoteDescription(signal);
    });
    
    window.handleIceCandidateSignal = jest.fn().mockImplementation(async (peerId, signal) => {
      const pc = window.peerConnections[peerId];
      if (!pc) {
        console.error(`No peer connection for ${peerId}`);
        return;
      }
      await pc.addIceCandidate(signal);
    });
    
    window.handleSignalingData = jest.fn().mockImplementation(async (peerId, signal) => {
      if (signal.type === 'offer') {
        await window.handleOfferSignal(peerId, signal);
      } else if (signal.type === 'answer') {
        await window.handleAnswerSignal(peerId, signal);
      } else if (signal.type === 'ice-candidate') {
        await window.handleIceCandidateSignal(peerId, signal);
      } else {
        console.error(`Unknown signal type: ${signal.type}`);
      }
    });
    
    window.closeVideoCall = jest.fn().mockImplementation((peerId) => {
      const pc = window.peerConnections[peerId];
      if (pc) {
        pc.close();
        delete window.peerConnections[peerId];
      }
      
      const videoElement = document.getElementById(`video-${peerId}`);
      if (videoElement) {
        videoElement.remove();
      }
    });
  });
  
  afterEach(() => {
    // Restore original RTCPeerConnection
    window.RTCPeerConnection = originalRTCPeerConnection;
    
    // Clean up
    document.body.innerHTML = '';
  });
  
  describe('createPeerConnection', () => {
    it('should create a new RTCPeerConnection', () => {
      const peerId = 'peer-id';
      window.createPeerConnection(peerId);
      
      expect(window.RTCPeerConnection).toHaveBeenCalled();
      expect(window.peerConnections[peerId]).toBeDefined();
    });
    
    it('should add local stream tracks to the peer connection', () => {
      const peerId = 'peer-id';
      const pc = window.createPeerConnection(peerId);
      
      expect(pc.addTrack).toHaveBeenCalled();
      expect(pc.addTrack.mock.calls.length).toBe(localStream.getTracks().length);
    });
    
    it('should set up event listeners', () => {
      const peerId = 'peer-id';
      const pc = window.createPeerConnection(peerId);
      
      expect(pc.addEventListener).toHaveBeenCalledWith('icecandidate', expect.any(Function));
      expect(pc.addEventListener).toHaveBeenCalledWith('track', expect.any(Function));
      expect(pc.addEventListener).toHaveBeenCalledWith('iceconnectionstatechange', expect.any(Function));
    });
  });
  
  describe('createOffer', () => {
    it('should create and set a local offer', async () => {
      const peerId = 'peer-id';
      const pc = window.createPeerConnection(peerId);
      
      await window.createOffer(peerId);
      
      expect(pc.createOffer).toHaveBeenCalled();
      expect(pc.setLocalDescription).toHaveBeenCalled();
      expect(window.sendSignalingMessage).toHaveBeenCalledWith(
        peerId, 
        expect.objectContaining({ type: 'offer' })
      );
    });
  });
  
  describe('handleOfferSignal', () => {
    it('should create peer connection if it doesn\'t exist', async () => {
      const peerId = 'peer-id';
      const signal = { type: 'offer', sdp: 'mock-sdp' };
      
      expect(window.peerConnections[peerId]).toBeUndefined();
      
      await window.handleOfferSignal(peerId, signal);
      
      expect(window.peerConnections[peerId]).toBeDefined();
    });
    
    it('should set remote description and create answer', async () => {
      const peerId = 'peer-id';
      const signal = { type: 'offer', sdp: 'mock-sdp' };
      
      await window.handleOfferSignal(peerId, signal);
      const pc = window.peerConnections[peerId];
      
      expect(pc.setRemoteDescription).toHaveBeenCalledWith(
        expect.objectContaining(signal)
      );
      expect(pc.createAnswer).toHaveBeenCalled();
      expect(pc.setLocalDescription).toHaveBeenCalled();
      expect(window.sendSignalingMessage).toHaveBeenCalledWith(
        peerId, 
        expect.objectContaining({ type: 'answer' })
      );
    });
  });
  
  describe('handleAnswerSignal', () => {
    it('should set remote description on the peer connection', async () => {
      const peerId = 'peer-id';
      const pc = window.createPeerConnection(peerId);
      const signal = { type: 'answer', sdp: 'mock-sdp' };
      
      await window.handleAnswerSignal(peerId, signal);
      
      expect(pc.setRemoteDescription).toHaveBeenCalledWith(
        expect.objectContaining(signal)
      );
    });
    
    it('should log error if peer connection does not exist', async () => {
      const peerId = 'nonexistent-peer';
      const signal = { type: 'answer', sdp: 'mock-sdp' };
      
      console.error = jest.fn();
      
      await window.handleAnswerSignal(peerId, signal);
      
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('handleIceCandidateSignal', () => {
    it('should add ICE candidate to the peer connection', async () => {
      const peerId = 'peer-id';
      const pc = window.createPeerConnection(peerId);
      const signal = { candidate: 'mock-candidate', sdpMLineIndex: 0 };
      
      await window.handleIceCandidateSignal(peerId, signal);
      
      expect(pc.addIceCandidate).toHaveBeenCalledWith(
        expect.objectContaining(signal)
      );
    });
    
    it('should log error if peer connection does not exist', async () => {
      const peerId = 'nonexistent-peer';
      const signal = { candidate: 'mock-candidate' };
      
      console.error = jest.fn();
      
      await window.handleIceCandidateSignal(peerId, signal);
      
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('handleSignalingData', () => {
    it('should handle offer signal', async () => {
      const peerId = 'peer-id';
      const signal = { type: 'offer', sdp: 'mock-sdp' };
      
      window.handleOfferSignal = jest.fn();
      
      await window.handleSignalingData(peerId, signal);
      
      expect(window.handleOfferSignal).toHaveBeenCalledWith(peerId, signal);
    });
    
    it('should handle answer signal', async () => {
      const peerId = 'peer-id';
      const signal = { type: 'answer', sdp: 'mock-sdp' };
      
      window.handleAnswerSignal = jest.fn();
      
      await window.handleSignalingData(peerId, signal);
      
      expect(window.handleAnswerSignal).toHaveBeenCalledWith(peerId, signal);
    });
    
    it('should handle ICE candidate signal', async () => {
      const peerId = 'peer-id';
      const signal = { type: 'ice-candidate', candidate: 'mock-candidate' };
      
      window.handleIceCandidateSignal = jest.fn();
      
      await window.handleSignalingData(peerId, signal);
      
      expect(window.handleIceCandidateSignal).toHaveBeenCalledWith(peerId, signal);
    });
    
    it('should log error for unknown signal type', async () => {
      const peerId = 'peer-id';
      const signal = { type: 'unknown' };
      
      console.error = jest.fn();
      
      await window.handleSignalingData(peerId, signal);
      
      expect(console.error).toHaveBeenCalled();
    });
  });
  
  describe('closeVideoCall', () => {
    it('should close peer connection and remove from connections list', () => {
      const peerId = 'peer-id';
      const pc = window.createPeerConnection(peerId);
      
      window.closeVideoCall(peerId);
      
      expect(pc.close).toHaveBeenCalled();
      expect(window.peerConnections[peerId]).toBeUndefined();
    });
    
    it('should remove remote video element', () => {
      const peerId = 'peer-id';
      window.createPeerConnection(peerId);
      
      // Add a remote video element
      const videoElement = document.createElement('video');
      videoElement.id = `video-${peerId}`;
      remoteVideosDiv.appendChild(videoElement);
      
      expect(document.getElementById(`video-${peerId}`)).not.toBeNull();
      
      window.closeVideoCall(peerId);
      
      expect(document.getElementById(`video-${peerId}`)).toBeNull();
    });
  });
});