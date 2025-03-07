/**
 * Unit tests for the media module
 */

import '../../../src/js/media.js';

describe('Media Module', () => {
  // Mock DOM elements
  let videoContainer;
  let localVideo;
  let videoDeviceSelect;
  let audioDeviceSelect;
  let toggleAudioButton;
  let toggleVideoButton;
  let shareScreenButton;
  
  // Mock streams and tracks
  let mockVideoTrack;
  let mockAudioTrack;
  let mockLocalStream;
  let mockScreenStream;
  
  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="videoContainer">
        <video id="localVideo" autoplay muted playsinline></video>
      </div>
      <div id="controls">
        <button id="toggleAudioButton">Toggle Audio</button>
        <button id="toggleVideoButton">Toggle Video</button>
        <button id="shareScreenButton">Share Screen</button>
      </div>
      <div id="deviceSelectionContainer">
        <select id="videoDeviceSelect"></select>
        <select id="audioDeviceSelect"></select>
      </div>
    `;
    
    // Get DOM elements
    videoContainer = document.getElementById('videoContainer');
    localVideo = document.getElementById('localVideo');
    videoDeviceSelect = document.getElementById('videoDeviceSelect');
    audioDeviceSelect = document.getElementById('audioDeviceSelect');
    toggleAudioButton = document.getElementById('toggleAudioButton');
    toggleVideoButton = document.getElementById('toggleVideoButton');
    shareScreenButton = document.getElementById('shareScreenButton');
    
    // Set up mock tracks
    mockVideoTrack = {
      kind: 'video',
      enabled: true,
      stop: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    
    mockAudioTrack = {
      kind: 'audio',
      enabled: true,
      stop: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    
    // Set up mock streams
    mockLocalStream = new MediaStream();
    mockLocalStream.getVideoTracks = jest.fn().mockReturnValue([mockVideoTrack]);
    mockLocalStream.getAudioTracks = jest.fn().mockReturnValue([mockAudioTrack]);
    mockLocalStream.getTracks = jest.fn().mockReturnValue([mockVideoTrack, mockAudioTrack]);
    mockLocalStream.addTrack = jest.fn();
    mockLocalStream.removeTrack = jest.fn();
    
    mockScreenStream = new MediaStream();
    const mockScreenTrack = { ...mockVideoTrack };
    mockScreenStream.getVideoTracks = jest.fn().mockReturnValue([mockScreenTrack]);
    mockScreenStream.getTracks = jest.fn().mockReturnValue([mockScreenTrack]);
    
    // Mock getUserMedia and getDisplayMedia
    navigator.mediaDevices.getUserMedia = jest.fn().mockResolvedValue(mockLocalStream);
    navigator.mediaDevices.getDisplayMedia = jest.fn().mockResolvedValue(mockScreenStream);
    
    // Mock device enumeration
    navigator.mediaDevices.enumerateDevices = jest.fn().mockResolvedValue([
      { kind: 'videoinput', deviceId: 'video1', label: 'Camera 1' },
      { kind: 'videoinput', deviceId: 'video2', label: 'Camera 2' },
      { kind: 'audioinput', deviceId: 'audio1', label: 'Microphone 1' },
      { kind: 'audioinput', deviceId: 'audio2', label: 'Microphone 2' },
    ]);
    
    // Set up global variables used by the media module
    window.localStream = null;
    window.screenStream = null;
    
    // Initialize module
    if (typeof window.initMedia === 'function') {
      window.initMedia();
    }
    
    // Spy on console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });
  
  describe('initMedia', () => {
    it('should initialize media devices and populate device selectors', async () => {
      if (typeof window.setupMediaDevices === 'function') {
        await window.setupMediaDevices();
        
        // Check that getUserMedia was called
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
        
        // Check that device selectors were populated
        expect(videoDeviceSelect.options.length).toBeGreaterThan(0);
        expect(audioDeviceSelect.options.length).toBeGreaterThan(0);
        
        // Check that local stream was set
        expect(window.localStream).not.toBeNull();
      }
    });
    
    it('should handle getUserMedia errors', async () => {
      // Simulate permission denied error
      const mediaError = new Error('Permission denied');
      mediaError.name = 'NotAllowedError';
      navigator.mediaDevices.getUserMedia = jest.fn().mockRejectedValue(mediaError);
      
      if (typeof window.setupMediaDevices === 'function') {
        await window.setupMediaDevices();
        
        // Check that error was logged
        expect(console.error).toHaveBeenCalled();
      }
    });
  });
  
  describe('toggleAudio', () => {
    it('should toggle audio track enabled state', () => {
      // Set up initial state
      window.localStream = mockLocalStream;
      
      if (typeof window.toggleAudio === 'function') {
        // Initially enabled
        expect(mockAudioTrack.enabled).toBe(true);
        
        // Toggle off
        window.toggleAudio();
        expect(mockAudioTrack.enabled).toBe(false);
        
        // Toggle on
        window.toggleAudio();
        expect(mockAudioTrack.enabled).toBe(true);
      }
    });
    
    it('should handle case when no audio tracks exist', () => {
      // Set up stream with no audio tracks
      mockLocalStream.getAudioTracks = jest.fn().mockReturnValue([]);
      window.localStream = mockLocalStream;
      
      if (typeof window.toggleAudio === 'function') {
        // Should not throw error
        expect(() => window.toggleAudio()).not.toThrow();
      }
    });
  });
  
  describe('toggleVideo', () => {
    it('should toggle video track enabled state', () => {
      // Set up initial state
      window.localStream = mockLocalStream;
      
      if (typeof window.toggleVideo === 'function') {
        // Initially enabled
        expect(mockVideoTrack.enabled).toBe(true);
        
        // Toggle off
        window.toggleVideo();
        expect(mockVideoTrack.enabled).toBe(false);
        
        // Toggle on
        window.toggleVideo();
        expect(mockVideoTrack.enabled).toBe(true);
      }
    });
    
    it('should handle case when no video tracks exist', () => {
      // Set up stream with no video tracks
      mockLocalStream.getVideoTracks = jest.fn().mockReturnValue([]);
      window.localStream = mockLocalStream;
      
      if (typeof window.toggleVideo === 'function') {
        // Should not throw error
        expect(() => window.toggleVideo()).not.toThrow();
      }
    });
  });
  
  describe('switchVideoDevice', () => {
    it('should switch to a different video device', async () => {
      // Setup
      window.localStream = mockLocalStream;
      
      if (typeof window.switchVideoDevice === 'function') {
        // Simulate device selection
        const newDeviceId = 'video2';
        
        // Call the function
        await window.switchVideoDevice(newDeviceId);
        
        // Check that getUserMedia was called with the new device
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
          expect.objectContaining({
            video: expect.objectContaining({
              deviceId: {exact: newDeviceId}
            })
          })
        );
        
        // Check that old tracks were stopped
        expect(mockVideoTrack.stop).toHaveBeenCalled();
      }
    });
    
    it('should handle device switching errors', async () => {
      // Setup
      window.localStream = mockLocalStream;
      
      // Simulate device error
      const deviceError = new Error('Device not found');
      navigator.mediaDevices.getUserMedia = jest.fn().mockRejectedValue(deviceError);
      
      if (typeof window.switchVideoDevice === 'function') {
        // Call the function
        await window.switchVideoDevice('invalid-device');
        
        // Check that error was logged
        expect(console.error).toHaveBeenCalled();
      }
    });
  });
  
  describe('switchAudioDevice', () => {
    it('should switch to a different audio device', async () => {
      // Setup
      window.localStream = mockLocalStream;
      
      if (typeof window.switchAudioDevice === 'function') {
        // Simulate device selection
        const newDeviceId = 'audio2';
        
        // Call the function
        await window.switchAudioDevice(newDeviceId);
        
        // Check that getUserMedia was called with the new device
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
          expect.objectContaining({
            audio: expect.objectContaining({
              deviceId: {exact: newDeviceId}
            })
          })
        );
        
        // Check that old tracks were stopped
        expect(mockAudioTrack.stop).toHaveBeenCalled();
      }
    });
  });
  
  describe('shareScreen', () => {
    it('should start screen sharing when not already sharing', async () => {
      // Setup
      window.localStream = mockLocalStream;
      window.screenStream = null;
      
      if (typeof window.shareScreen === 'function') {
        // Call the function
        await window.shareScreen();
        
        // Check that getDisplayMedia was called
        expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled();
        
        // Check that screen stream was set
        expect(window.screenStream).not.toBeNull();
      }
    });
    
    it('should stop screen sharing when already sharing', async () => {
      // Setup - already sharing screen
      window.localStream = mockLocalStream;
      window.screenStream = mockScreenStream;
      
      if (typeof window.shareScreen === 'function') {
        // Call the function
        await window.shareScreen();
        
        // Check that tracks were stopped
        const screenTracks = mockScreenStream.getVideoTracks();
        expect(screenTracks[0].stop).toHaveBeenCalled();
        
        // Check that screen stream was cleared
        expect(window.screenStream).toBeNull();
      }
    });
    
    it('should handle screen sharing errors', async () => {
      // Setup
      window.localStream = mockLocalStream;
      
      // Simulate user cancellation
      const sharingError = new Error('User cancelled');
      sharingError.name = 'AbortError';
      navigator.mediaDevices.getDisplayMedia = jest.fn().mockRejectedValue(sharingError);
      
      if (typeof window.shareScreen === 'function') {
        // Call the function
        await window.shareScreen();
        
        // Check that error was handled (not thrown)
        expect(console.error).toHaveBeenCalled();
        expect(window.screenStream).toBeNull();
      }
    });
  });
});