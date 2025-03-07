/**
 * WebRTC utility functions for video chat application
 */

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

/**
 * Creates and configures a new RTCPeerConnection
 * @returns {RTCPeerConnection} The configured peer connection object
 */
export function createPeerConnection() {
  const peerConnection = new RTCPeerConnection(ICE_SERVERS);
  
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      // In a real application, you would send this candidate to the remote peer
      // through your signaling server
      console.log('New ICE candidate:', event.candidate);
    }
  };
  
  peerConnection.ontrack = (event) => {
    // In a real application, you would add this track to the remote video element
    console.log('Remote track received:', event.track);
    
    // This function returns the first stream associated with the track event
    return event.streams[0];
  };
  
  peerConnection.oniceconnectionstatechange = () => {
    console.log('ICE connection state:', peerConnection.iceConnectionState);
  };
  
  return peerConnection;
}

/**
 * Creates an offer to initiate a WebRTC connection
 * @param {RTCPeerConnection} peerConnection - The RTCPeerConnection object
 * @returns {Promise<RTCSessionDescription>} The created offer
 */
export async function createOffer(peerConnection) {
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    // In a real application, you would send this offer to the remote peer
    // through your signaling server
    console.log('Offer created:', offer);
    
    return offer;
  } catch (error) {
    console.error('Error creating offer:', error);
    throw error;
  }
}

/**
 * Creates an answer in response to a received offer
 * @param {RTCPeerConnection} peerConnection - The RTCPeerConnection object
 * @param {RTCSessionDescription} offer - The received offer
 * @returns {Promise<RTCSessionDescription>} The created answer
 */
export async function createAnswer(peerConnection, offer) {
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    
    // In a real application, you would send this answer to the remote peer
    // through your signaling server
    console.log('Answer created:', answer);
    
    return answer;
  } catch (error) {
    console.error('Error creating answer:', error);
    throw error;
  }
}

/**
 * Adds a remote answer to complete the connection setup
 * @param {RTCPeerConnection} peerConnection - The RTCPeerConnection object
 * @param {RTCSessionDescription} answer - The received answer
 */
export async function addAnswer(peerConnection, answer) {
  try {
    if (!peerConnection.currentRemoteDescription) {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Remote description set successfully');
    }
  } catch (error) {
    console.error('Error adding answer:', error);
    throw error;
  }
}

/**
 * Adds ICE candidate received from the remote peer
 * @param {RTCPeerConnection} peerConnection - The RTCPeerConnection object
 * @param {RTCIceCandidate} candidate - The ICE candidate to add
 */
export async function addIceCandidate(peerConnection, candidate) {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    console.log('ICE candidate added successfully');
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
    throw error;
  }
}

/**
 * Adds media stream to the peer connection
 * @param {RTCPeerConnection} peerConnection - The RTCPeerConnection object
 * @param {MediaStream} stream - The media stream to add
 */
export function addMediaStream(peerConnection, stream) {
  stream.getTracks().forEach(track => {
    peerConnection.addTrack(track, stream);
    console.log('Track added to peer connection:', track.kind);
  });
}

/**
 * Toggles the camera (video track) on/off
 * @param {MediaStream} stream - The local media stream
 * @returns {boolean} The new state of the camera (true = on, false = off)
 */
export function toggleCamera(stream) {
  const videoTrack = stream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
    return videoTrack.enabled;
  }
  return false;
}

/**
 * Toggles the microphone (audio track) on/off
 * @param {MediaStream} stream - The local media stream
 * @returns {boolean} The new state of the microphone (true = on, false = off)
 */
export function toggleMicrophone(stream) {
  const audioTrack = stream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled;
    return audioTrack.enabled;
  }
  return false;
}

/**
 * Starts screen sharing
 * @param {RTCPeerConnection} peerConnection - The RTCPeerConnection object
 * @param {MediaStream} localStream - The local media stream
 * @returns {Promise<MediaStream>} The updated local stream with screen sharing
 */
export async function startScreenSharing(peerConnection, localStream) {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true
    });
    
    const videoTrack = screenStream.getVideoTracks()[0];
    
    // Replace video track in peer connections
    const sender = peerConnection.getSenders().find(s => 
      s.track.kind === videoTrack.kind
    );
    
    if (sender) {
      sender.replaceTrack(videoTrack);
    }
    
    // Update local stream
    const oldVideoTrack = localStream.getVideoTracks()[0];
    oldVideoTrack.stop();
    localStream.removeTrack(oldVideoTrack);
    localStream.addTrack(videoTrack);
    
    // Set up listener for when screen sharing ends
    videoTrack.onended = async () => {
      // Revert to camera when the user stops sharing
      await stopScreenSharing(peerConnection, localStream);
    };
    
    return localStream;
  } catch (error) {
    console.error('Error starting screen sharing:', error);
    throw error;
  }
}

/**
 * Stops screen sharing and reverts to camera
 * @param {RTCPeerConnection} peerConnection - The RTCPeerConnection object
 * @param {MediaStream} localStream - The local media stream
 * @returns {Promise<MediaStream>} The updated local stream with camera
 */
export async function stopScreenSharing(peerConnection, localStream) {
  try {
    // Get a new video track from the camera
    const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
    const videoTrack = cameraStream.getVideoTracks()[0];
    
    // Replace track in peer connection
    const sender = peerConnection.getSenders().find(s =>
      s.track.kind === 'video'
    );
    
    if (sender) {
      sender.replaceTrack(videoTrack);
    }
    
    // Update local stream
    const oldVideoTrack = localStream.getVideoTracks()[0];
    oldVideoTrack.stop();
    localStream.removeTrack(oldVideoTrack);
    localStream.addTrack(videoTrack);
    
    return localStream;
  } catch (error) {
    console.error('Error stopping screen sharing:', error);
    throw error;
  }
}