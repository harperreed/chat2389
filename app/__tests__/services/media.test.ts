import { MediaManager } from '../../services/media';

describe('MediaManager', () => {
  let mediaManager: MediaManager;

  // Mock navigator.mediaDevices.getUserMedia
  const mockMediaDevices = {
    getUserMedia: jest.fn(),
    enumerateDevices: jest.fn()
  };

  const mockMediaStream = {
    getTracks: jest.fn().mockReturnValue([
      { kind: 'audio', enabled: true, stop: jest.fn() },
      { kind: 'video', enabled: true, stop: jest.fn() }
    ]),
    getAudioTracks: jest.fn().mockReturnValue([
      { kind: 'audio', enabled: true, stop: jest.fn() }
    ]),
    getVideoTracks: jest.fn().mockReturnValue([
      { kind: 'video', enabled: true, stop: jest.fn() }
    ])
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock for getUserMedia
    mockMediaDevices.getUserMedia.mockResolvedValue(mockMediaStream);
    
    // Setup mock for enumerateDevices
    mockMediaDevices.enumerateDevices.mockResolvedValue([
      { kind: 'audioinput', deviceId: 'audio1', label: 'Audio 1' },
      { kind: 'audioinput', deviceId: 'audio2', label: 'Audio 2' },
      { kind: 'videoinput', deviceId: 'video1', label: 'Video 1' },
      { kind: 'videoinput', deviceId: 'video2', label: 'Video 2' },
      { kind: 'audiooutput', deviceId: 'output1', label: 'Output 1' }
    ]);
    
    // Assign mock to navigator.mediaDevices
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: mockMediaDevices,
      writable: true
    });
    
    mediaManager = new MediaManager();
  });

  test('should initialize with media stream', async () => {
    const stream = await mediaManager.initialize({ audio: true, video: true });
    
    expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true, video: true });
    expect(stream).toBe(mockMediaStream);
  });

  test('should toggle audio', async () => {
    await mediaManager.initialize({ audio: true, video: true });
    
    const mockAudioTrack = mockMediaStream.getAudioTracks()[0];
    // Initial state should be enabled
    expect(mockAudioTrack.enabled).toBe(true);
    
    // Toggle audio off
    const result1 = mediaManager.toggleAudio();
    expect(result1).toBe(false);
    expect(mockAudioTrack.enabled).toBe(false);
    
    // Toggle audio on
    const result2 = mediaManager.toggleAudio();
    expect(result2).toBe(true);
    expect(mockAudioTrack.enabled).toBe(true);
  });

  test('should toggle video', async () => {
    await mediaManager.initialize({ audio: true, video: true });
    
    const mockVideoTrack = mockMediaStream.getVideoTracks()[0];
    mockVideoTrack.enabled = true;
    
    // Toggle video off
    const result1 = mediaManager.toggleVideo();
    expect(result1).toBe(false);
    
    // Toggle video on
    mockVideoTrack.enabled = false;
    const result2 = mediaManager.toggleVideo();
    expect(result2).toBe(true);
  });

  test('should enumerate devices', async () => {
    await mediaManager.initialize({ audio: true, video: true });
    await mediaManager.enumerateDevices();
    
    expect(mockMediaDevices.enumerateDevices).toHaveBeenCalled();
    
    const audioDevices = mediaManager.getAudioInputDevices();
    expect(audioDevices.length).toBe(2);
    expect(audioDevices[0].deviceId).toBe('audio1');
    
    const videoDevices = mediaManager.getVideoInputDevices();
    expect(videoDevices.length).toBe(2);
    expect(videoDevices[0].deviceId).toBe('video1');
    
    const outputDevices = mediaManager.getAudioOutputDevices();
    expect(outputDevices.length).toBe(1);
    expect(outputDevices[0].deviceId).toBe('output1');
  });

  test('should stop all tracks', async () => {
    await mediaManager.initialize({ audio: true, video: true });
    
    const tracks = mockMediaStream.getTracks();
    
    mediaManager.stop();
    
    expect(tracks[0].stop).toHaveBeenCalled();
    expect(tracks[1].stop).toHaveBeenCalled();
  });
});