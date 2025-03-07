/**
 * Signaling service for WebRTC video chat application
 * This is a simple implementation that would typically be replaced by a real signaling server
 */

// For a real application, this would be replaced with Firebase, PocketBase,
// or another real-time backend service as used in the existing codebase
class SignalingService {
  constructor() {
    this.callbacks = {};
    this.roomListeners = {};
    this.simulatedDelay = 500; // ms to simulate network delay
  }

  /**
   * Join a room for signaling
   * @param {string} roomId - The room ID to join
   * @param {object} callbacks - Callback functions for signaling events
   */
  joinRoom(roomId, callbacks = {}) {
    console.log(`Joining room: ${roomId}`);
    
    // Store the callbacks for this connection
    this.callbacks[roomId] = callbacks;
    
    // Simulate connection success
    setTimeout(() => {
      if (callbacks.onRoomJoined) {
        callbacks.onRoomJoined(roomId);
      }
    }, this.simulatedDelay);
    
    return {
      // Return methods to interact with this room
      sendOffer: (offer) => this.sendOffer(roomId, offer),
      sendAnswer: (answer) => this.sendAnswer(roomId, answer),
      sendIceCandidate: (candidate) => this.sendIceCandidate(roomId, candidate),
      sendMessage: (message) => this.sendMessage(roomId, message),
      leaveRoom: () => this.leaveRoom(roomId)
    };
  }

  /**
   * Create a new room for signaling
   * @returns {Promise<string>} The created room ID
   */
  async createRoom() {
    // Generate a random room ID
    const roomId = Math.random().toString(36).substring(2, 8);
    console.log(`Created new room: ${roomId}`);
    
    // In a real application, this would create a room on your signaling server
    return roomId;
  }

  /**
   * Send an WebRTC offer to the room
   * @param {string} roomId - The room ID
   * @param {RTCSessionDescription} offer - The WebRTC offer
   */
  sendOffer(roomId, offer) {
    console.log(`Sending offer in room ${roomId}:`, offer);
    
    // In a real application, this would send the offer through your signaling server
    // This is a simulation for the example
    setTimeout(() => {
      // Simulate receiving an offer (for the other peer)
      if (this.callbacks[roomId] && this.callbacks[roomId].onOffer) {
        this.callbacks[roomId].onOffer(offer);
      }
    }, this.simulatedDelay);
  }

  /**
   * Send an WebRTC answer to the room
   * @param {string} roomId - The room ID
   * @param {RTCSessionDescription} answer - The WebRTC answer
   */
  sendAnswer(roomId, answer) {
    console.log(`Sending answer in room ${roomId}:`, answer);
    
    // In a real application, this would send the answer through your signaling server
    // This is a simulation for the example
    setTimeout(() => {
      // Simulate receiving an answer (for the other peer)
      if (this.callbacks[roomId] && this.callbacks[roomId].onAnswer) {
        this.callbacks[roomId].onAnswer(answer);
      }
    }, this.simulatedDelay);
  }

  /**
   * Send an ICE candidate to the room
   * @param {string} roomId - The room ID
   * @param {RTCIceCandidate} candidate - The ICE candidate
   */
  sendIceCandidate(roomId, candidate) {
    console.log(`Sending ICE candidate in room ${roomId}:`, candidate);
    
    // In a real application, this would send the ICE candidate through your signaling server
    // This is a simulation for the example
    setTimeout(() => {
      // Simulate receiving an ICE candidate (for the other peer)
      if (this.callbacks[roomId] && this.callbacks[roomId].onIceCandidate) {
        this.callbacks[roomId].onIceCandidate(candidate);
      }
    }, this.simulatedDelay);
  }

  /**
   * Send a chat message to the room
   * @param {string} roomId - The room ID
   * @param {object} message - The message object
   */
  sendMessage(roomId, message) {
    console.log(`Sending message in room ${roomId}:`, message);
    
    // In a real application, this would send the message through your signaling server
    // This is a simulation for the example
    setTimeout(() => {
      // Simulate receiving a message (for the other peer)
      if (this.callbacks[roomId] && this.callbacks[roomId].onMessage) {
        this.callbacks[roomId].onMessage(message);
      }
    }, this.simulatedDelay);
  }

  /**
   * Leave a room
   * @param {string} roomId - The room ID to leave
   */
  leaveRoom(roomId) {
    console.log(`Leaving room: ${roomId}`);
    
    // In a real application, this would notify the signaling server
    // and other peers that this user has left
    
    // Clean up callbacks for this room
    delete this.callbacks[roomId];
  }
}

// Export a singleton instance
const signalingService = new SignalingService();
export default signalingService;