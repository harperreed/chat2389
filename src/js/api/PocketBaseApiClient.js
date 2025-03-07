import PocketBase from 'pocketbase';
import ApiInterface from './ApiInterface.js';
import { BACKENDS } from './config.js';

/**
 * PocketBase API client implementing the ApiInterface
 * for communicating with a PocketBase backend.
 * 
 * This client handles communication with PocketBase including
 * real-time subscriptions for signaling.
 */
export default class PocketBaseApiClient extends ApiInterface {
  /**
   * Creates a new PocketBase API client
   * @param {string} baseUrl - Base URL for the PocketBase API (e.g., 'https://example.pockethost.io')
   * @param {Object} options - Additional options
   * @param {number} [options.defaultTimeout=30000] - Default timeout in milliseconds
   * @param {number} [options.maxRetries=3] - Maximum number of retries for failed requests
   * @param {boolean} [options.debug=false] - Enable debug logging
   * @param {boolean} [options.enableHealthCheck=false] - Enable automatic health checking
   */
  constructor(baseUrl = '', options = {}) {
    super({
      defaultTimeout: options.defaultTimeout || 30000,
      maxRetries: options.maxRetries || 3
    });
    
    if (!baseUrl) {
      throw new Error('PocketBase requires a base URL');
    }
    
    this.baseUrl = baseUrl;
    this.debug = options.debug || false;
    this._backendType = BACKENDS.POCKETBASE;
    this._isConnected = true; // Assume connected initially
    
    // Initialize PocketBase client
    this.pb = new PocketBase(baseUrl);
    
    // Store active subscriptions
    this._subscriptions = new Map();
    
    // If health check is enabled, start it
    if (options.enableHealthCheck) {
      this._startHealthCheck(options.healthCheckInterval || 30000);
    }
    
    this._log('PocketBaseApiClient initialized');
  }
  
  /**
   * Internal logging method that respects debug setting
   * @param {...any} args - Arguments to log
   * @private
   */
  _log(...args) {
    if (this.debug) {
      console.debug('[PocketBaseApiClient]', ...args);
    }
  }
  
  /**
   * Starts a health check interval to verify API connectivity
   * @param {number} interval - Interval in milliseconds
   * @private
   */
  _startHealthCheck(interval) {
    this._healthCheckInterval = setInterval(async () => {
      try {
        const response = await fetch(`${this.baseUrl}/api/health`, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(5000) // 5 second timeout for health checks
        });
        
        const wasConnected = this._isConnected;
        this._isConnected = response.ok;
        
        if (!wasConnected && this._isConnected) {
          this._log('API connection restored');
          this.onConnectionRestored?.();
        } else if (wasConnected && !this._isConnected) {
          this._log('API connection lost');
          this.onConnectionLost?.();
        }
      } catch (error) {
        this._isConnected = false;
        this._log('Health check failed:', error.message);
        this.onConnectionLost?.();
      }
    }, interval);
  }
  
  /**
   * Stops the health check interval
   * @private
   */
  _stopHealthCheck() {
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
      this._healthCheckInterval = null;
    }
  }

  /**
   * Create a new room
   * @param {Object} [options] - Options for creating the room
   * @returns {Promise<{success: boolean, roomId: string, error: string}>}
   */
  async createRoom(options = {}) {
    try {
      const record = await this.pb.collection('rooms').create({
        metadata: options.metadata ? JSON.stringify(options.metadata) : null,
        created: new Date().toISOString()
      });
      
      return { 
        success: true, 
        roomId: record.id
      };
    } catch (error) {
      this._log('Error creating room:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Join an existing room
   * @param {string} roomId - ID of the room to join
   * @param {Object} [options] - Options for joining the room
   * @returns {Promise<{success: boolean, roomId: string, userId: string, participants: number, error: string}>}
   */
  async joinRoom(roomId, options = {}) {
    try {
      this._validateRoomId(roomId);
      
      // Check if room exists
      let room;
      try {
        room = await this.pb.collection('rooms').getOne(roomId);
      } catch (e) {
        // Room doesn't exist
        return { success: false, error: 'Room does not exist' };
      }
      
      // Create a participant for this user
      const userId = crypto.randomUUID().slice(0, 8); // Generate random 8-char ID
      
      const participant = await this.pb.collection('participants').create({
        room: roomId,
        userId: userId,
        joined: new Date().toISOString(),
        metadata: options.metadata ? JSON.stringify(options.metadata) : null
      });
      
      // Subscribe to signal updates for this room and user
      this._subscribeToSignals(roomId, userId);
      
      // Get current participants count
      const participants = await this.pb.collection('participants').getList(1, 100, {
        filter: `room = "${roomId}" && active = true`
      });
      
      return {
        success: true,
        roomId,
        userId,
        participants: participants.items.length
      };
      
    } catch (error) {
      this._log('Error joining room:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Leave a room
   * @param {string} roomId - ID of the room to leave
   * @param {string} userId - ID of the user leaving
   * @returns {Promise<{success: boolean, error: string}>}
   */
  async leaveRoom(roomId, userId) {
    try {
      this._validateRoomId(roomId);
      this._validateUserId(userId);
      
      // Find the participant
      const result = await this.pb.collection('participants').getList(1, 1, {
        filter: `room = "${roomId}" && userId = "${userId}" && active = true`
      });
      
      if (result.items.length === 0) {
        return { success: false, error: 'User not found in room' };
      }
      
      const participant = result.items[0];
      
      // Mark as inactive rather than deleting
      await this.pb.collection('participants').update(participant.id, {
        active: false,
        left: new Date().toISOString()
      });
      
      // Unsubscribe from signals
      this._unsubscribeFromSignals(roomId, userId);
      
      // Check if room is empty
      const remainingParticipants = await this.pb.collection('participants').getList(1, 1, {
        filter: `room = "${roomId}" && active = true`
      });
      
      if (remainingParticipants.items.length === 0) {
        // If room is empty, mark it as inactive
        await this.pb.collection('rooms').update(roomId, {
          active: false,
          closed: new Date().toISOString()
        });
      }
      
      return { success: true };
      
    } catch (error) {
      this._log('Error leaving room:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get the status of a room
   * @param {string} roomId - ID of the room
   * @returns {Promise<{success: boolean, roomId: string, participants: number, users: string[], error: string}>}
   */
  async getRoomStatus(roomId) {
    try {
      this._validateRoomId(roomId);
      
      // Check if room exists
      let room;
      try {
        room = await this.pb.collection('rooms').getOne(roomId);
      } catch (e) {
        return { success: false, error: 'Room does not exist' };
      }
      
      if (!room.active) {
        return { success: false, error: 'Room is no longer active' };
      }
      
      // Get participants
      const participantsResult = await this.pb.collection('participants').getList(1, 100, {
        filter: `room = "${roomId}" && active = true`
      });
      
      const users = participantsResult.items.map(p => p.userId);
      
      return {
        success: true,
        roomId,
        participants: users.length,
        users
      };
      
    } catch (error) {
      this._log('Error getting room status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a WebRTC signal to another user
   * @param {string} roomId - ID of the room
   * @param {string} userId - ID of the user sending the signal
   * @param {string} targetId - ID of the user to receive the signal
   * @param {object} signal - WebRTC signal data
   * @returns {Promise<{success: boolean, error: string}>}
   */
  async sendSignal(roomId, userId, targetId, signal) {
    try {
      this._validateRoomId(roomId);
      this._validateUserId(userId);
      this._validateUserId(targetId);
      this._validateSignal(signal);
      
      // Store the signal in the database
      await this.pb.collection('signals').create({
        room: roomId,
        from: userId,
        to: targetId,
        signal: JSON.stringify(signal),
        created: new Date().toISOString(),
        processed: false
      });
      
      return { success: true };
      
    } catch (error) {
      this._log('Error sending signal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending signals for a user
   * @param {string} roomId - ID of the room
   * @param {string} userId - ID of the user
   * @param {Object} [options] - Options for getting signals
   * @param {string} [options.since] - Get signals since this timestamp
   * @returns {Promise<{success: boolean, signals: Array<{from: string, signal: object}>, error: string}>}
   */
  async getSignals(roomId, userId, options = {}) {
    try {
      this._validateRoomId(roomId);
      this._validateUserId(userId);
      
      // Build filter for unprocessed signals for this user
      let filter = `room = "${roomId}" && to = "${userId}" && processed = false`;
      
      // Add since filter if provided
      if (options.since) {
        filter += ` && created > "${options.since}"`;
      }
      
      // Get signals
      const signalsResult = await this.pb.collection('signals').getList(1, 100, {
        filter,
        sort: 'created'
      });
      
      // Format signals
      const signals = signalsResult.items.map(s => ({
        from: s.from,
        signal: JSON.parse(s.signal)
      }));
      
      // Mark signals as processed
      const signalIds = signalsResult.items.map(s => s.id);
      for (const id of signalIds) {
        await this.pb.collection('signals').update(id, {
          processed: true,
          retrievedAt: new Date().toISOString()
        });
      }
      
      return {
        success: true,
        signals
      };
      
    } catch (error) {
      this._log('Error getting signals:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe to real-time signals for a user in a room
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @private
   */
  _subscribeToSignals(roomId, userId) {
    const key = `${roomId}:${userId}`;
    
    // Unsubscribe if already subscribed
    if (this._subscriptions.has(key)) {
      this._unsubscribeFromSignals(roomId, userId);
    }
    
    try {
      // Subscribe to signals collection with filter
      const unsubscribe = this.pb.collection('signals').subscribe(`room="${roomId}" && to="${userId}" && processed=false`, e => {
        this._log(`Received real-time signal event: ${e.action}`);
        
        if (e.action === 'create') {
          // Handle new signal
          const signal = {
            from: e.record.from,
            signal: JSON.parse(e.record.signal)
          };
          
          // Call the onSignal handler if available
          this.onSignal?.(signal.from, signal.signal);
          
          // Mark as processed
          this.pb.collection('signals').update(e.record.id, {
            processed: true,
            retrievedAt: new Date().toISOString()
          }).catch(err => {
            this._log('Error marking signal as processed:', err);
          });
        }
      });
      
      // Store the unsubscribe function
      this._subscriptions.set(key, unsubscribe);
      this._log(`Subscribed to signals for room ${roomId}, user ${userId}`);
      
    } catch (error) {
      this._log('Error subscribing to signals:', error);
    }
  }

  /**
   * Unsubscribe from signals for a user in a room
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @private
   */
  _unsubscribeFromSignals(roomId, userId) {
    const key = `${roomId}:${userId}`;
    
    if (this._subscriptions.has(key)) {
      const unsubscribe = this._subscriptions.get(key);
      unsubscribe();
      this._subscriptions.delete(key);
      this._log(`Unsubscribed from signals for room ${roomId}, user ${userId}`);
    }
  }

  /**
   * Cleans up resources used by the client
   */
  destroy() {
    this._stopHealthCheck();
    
    // Unsubscribe from all signals
    for (const unsubscribe of this._subscriptions.values()) {
      unsubscribe();
    }
    this._subscriptions.clear();
  }
}