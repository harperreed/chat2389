/**
 * Setup file for Jest tests
 * This file runs before each test
 */

// Mock browser APIs not available in jsdom
global.MediaStream = jest.fn().mockImplementation(() => ({
  getTracks: () => [],
  getVideoTracks: () => [],
  getAudioTracks: () => [],
  addTrack: jest.fn(),
  removeTrack: jest.fn(),
}));

global.MediaStreamTrack = jest.fn().mockImplementation(() => ({
  enabled: true,
  kind: 'video',
  stop: jest.fn(),
}));

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: jest.fn().mockImplementation(() => 
      Promise.resolve(new global.MediaStream())
    ),
    getDisplayMedia: jest.fn().mockImplementation(() => 
      Promise.resolve(new global.MediaStream())
    ),
    enumerateDevices: jest.fn().mockImplementation(() => 
      Promise.resolve([
        { kind: 'videoinput', deviceId: 'video1', label: 'Camera 1' },
        { kind: 'audioinput', deviceId: 'audio1', label: 'Microphone 1' },
        { kind: 'audiooutput', deviceId: 'output1', label: 'Speaker 1' },
      ])
    ),
  },
  configurable: true,
});

// Mock RTCPeerConnection
global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
  createOffer: jest.fn().mockImplementation(() => Promise.resolve({ type: 'offer', sdp: 'sdp' })),
  createAnswer: jest.fn().mockImplementation(() => Promise.resolve({ type: 'answer', sdp: 'sdp' })),
  setLocalDescription: jest.fn().mockImplementation(() => Promise.resolve()),
  setRemoteDescription: jest.fn().mockImplementation(() => Promise.resolve()),
  addIceCandidate: jest.fn().mockImplementation(() => Promise.resolve()),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  getReceivers: jest.fn().mockImplementation(() => []),
  getSenders: jest.fn().mockImplementation(() => []),
  getLocalStreams: jest.fn().mockImplementation(() => []),
  getRemoteStreams: jest.fn().mockImplementation(() => []),
  onicecandidate: null,
  oniceconnectionstatechange: null,
  ontrack: null,
  onnegotiationneeded: null,
  iceConnectionState: 'new',
  localDescription: null,
  remoteDescription: null,
}));

// Mock RTCSessionDescription
global.RTCSessionDescription = jest.fn().mockImplementation((init) => init);

// Mock RTCIceCandidate
global.RTCIceCandidate = jest.fn().mockImplementation((init) => init);

// Mock fetch API
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
    text: () => Promise.resolve(''),
    status: 200,
  })
);

// Add missing DOM APIs
if (!global.document.createRange) {
  global.document.createRange = () => ({
    setStart: () => {},
    setEnd: () => {},
    commonAncestorContainer: {
      nodeName: 'BODY',
      ownerDocument: document,
    },
  });
}

// Console error/warning suppression during tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
console.error = (...args) => {
  if (args[0] && args[0].includes && args[0].includes('Not implemented')) {
    return;
  }
  originalConsoleError(...args);
};
console.warn = (...args) => {
  if (args[0] && args[0].includes && args[0].includes('Warning')) {
    return;
  }
  originalConsoleWarn(...args);
};