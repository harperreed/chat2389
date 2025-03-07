import ApiInterface from './ApiInterface.js';
import { BACKENDS } from './config.js';

/**
 * Mock API client for testing and development.
 * Simulates backend behavior with in-memory data.
 * 
 * This implementation is useful for:
 * - Local development without a backend server
 * - Automated testing
 * - Demonstrations and presentations
 * - Offline usage
 */
export default class MockApiClient extends ApiInterface {
  /**
   * Creates a new mock API client
   * @param {Object} options - Configuration options
   * @param {number} [options.delayMs=100] - Simulated network delay in milliseconds
   * @param {boolean} [options.debug=false] - Enable debug logging
   * @param {boolean} [options.failRate=0] - Rate of random failures (0-1)
   * @param {Object} [options.initialData] - Initial data to populate the mock database
   */
  constructor(options = {}) {
    super();
    this._backendType = BACKENDS.MOCK;
    this._isConnected = true;
    
    // Configuration
    this.delayMs = options.delayMs !== undefined ? options.delayMs : 100;
    this.debug = options.debug || false;
    this.failRate = options.failRate || 0;
    
    // In-memory storage for rooms and signals
    this.rooms = {};
    this.signals = {};
    
    // Counter for events to help with efficient pagination
    this.eventCounter = 0;
    
    // Import initial data if provided
    if (options.initialData) {
      this._importData(options.initialData);
    }
    
    this._log('MockApiClient initialized');
  }
  
  /**
   * Log messages if debug is enabled
   * @param  {...any} args - Arguments to log
   * @private
   */
  _log(...args) {
    if (this.debug) {
      console.debug('[MockApiClient]', ...args);
    }
  }
  
  /**
   * Imports data into the mock database
   * @param {Object} data - Data to import
   * @private
   */
  _importData(data) {
    if (data.rooms) {
      this.rooms = JSON.parse(JSON.stringify(data.rooms));
    }
    
    if (data.signals) {
      this.signals = JSON.parse(JSON.stringify(data.signals));
    }
    
    if (data.eventCounter) {
      this.eventCounter = data.eventCounter;
    }
    
    this._log('Imported data:', { rooms: Object.keys(this.rooms).length });
  }
  
  /**
   * Exports the current state of the mock database
   * @returns {Object} Current state
   */
  exportData() {
    return {
      rooms: JSON.parse(JSON.stringify(this.rooms)),
      signals: JSON.parse(JSON.stringify(this.signals)),
      eventCounter: this.eventCounter
    };
  }
  
  /**
   * Clears all data in the mock database
   */
  clearData() {
    this.rooms = {};
    this.signals = {};
    this.eventCounter = 0;
    this._log('Cleared all data');
  }

  /**
   * Generate a random ID
   * @returns {string} 8-character random ID
   * @private
   */
  _generateId() {
    return Math.random().toString(36).substring(2, 10);
  }

  /**
   * Simulate network delay
   * @param {number} ms - Milliseconds to delay (defaults to configured delay)
   * @returns {Promise<void>}
   * @private
   */
  async _delay(ms) {
    const delayTime = ms !== undefined ? ms : this.delayMs;
    if (delayTime > 0) {
      await new Promise(resolve => setTimeout(resolve, delayTime));
    }
  }
  
  /**
   * Simulates random failures for testing error handling
   * @throws {Error} If the simulated failure occurs
   * @private
   */
  _simulateRandomFailures() {
    if (this.failRate > 0 && Math.random() < this.failRate) {
      const errorTypes = [
        'Network error: Connection reset',
        'Timeout error: Request took too long',
        'Server error: Internal error',
        'Auth error: Unauthorized'
      ];
      
      const error = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      this._log('Simulating random failure:', error);
      throw new Error(error);
    }
  }
  
  /**
   * Updates the event counter and returns the new value
   * @returns {number} New event counter value
   * @private
   */
  _getNextEventId() {
    return ++this.eventCounter;
  }

  /**
   * Create a new room
   * @param {Object} [options] - Options for creating the room
   * @returns {Promise<{success: boolean, roomId: string, error: string}>}
   */
  async createRoom(options = {}) {
    try {
      await this._delay();
      this._simulateRandomFailures();
      
      const roomId = this._generateId();
      this.rooms[roomId] = {
        id: roomId,
        createdAt: new Date().toISOString(),
        users: [],
        signals: [],
        metadata: options.metadata || {}
      };
      
      this._log('Created room:', roomId);
      
      return {
        success: true,
        roomId,
        created: true
      };
    } catch (error) {
      this._log('Error creating room:', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Join an existing room
   * @param {string} roomId - ID of the room to join
   * @param {Object} [options] - Options for joining the room
   * @returns {Promise<{success: boolean, roomId: string, userId: string, participants: number, error: string}>}
   */
  async joinRoom(roomId, options = {}) {
    // Validate parameters first - this should throw errors as required by the tests
    if (!roomId) {
      throw new Error('Room ID is required');
    }
    
    if (typeof roomId !== 'string') {
      throw new Error('Room ID must be a string');
    }
    
    if (roomId.trim() === '') {
      throw new Error('Room ID cannot be empty');
    }
    
    try {
      await this._delay();
      this._simulateRandomFailures();
      
      if (!this.rooms[roomId]) {
        return {
          success: false,
          error: 'Room does not exist'
        };
      }
      
      const userId = this._generateId();
      const metadata = options.metadata || {};
      
      // Add user to room with timestamp and event ID for efficient signal handling
      this.rooms[roomId].users.push({
        id: userId,
        joinedAt: new Date().toISOString(),
        eventId: this._getNextEventId(),
        metadata
      });
      
      this._log(`User ${userId} joined room ${roomId}`);
      
      return {
        success: true,
        roomId,
        userId,
        participants: this.rooms[roomId].users.length,
        eventId: this.eventCounter
      };
    } catch (error) {
      this._log('Error joining room:', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Leave a room
   * @param {string} roomId - ID of the room to leave
   * @param {string} userId - ID of the user leaving
   * @returns {Promise<{success: boolean, error: string}>}
   */
  async leaveRoom(roomId, userId) {
    // Validate parameters first - this should throw errors as required by the tests
    if (!roomId) {
      throw new Error('Room ID is required');
    }
    
    if (typeof roomId !== 'string') {
      throw new Error('Room ID must be a string');
    }
    
    if (roomId.trim() === '') {
      throw new Error('Room ID cannot be empty');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (typeof userId !== 'string') {
      throw new Error('User ID must be a string');
    }
    
    if (userId.trim() === '') {
      throw new Error('User ID cannot be empty');
    }
    
    try {
      await this._delay();
      this._simulateRandomFailures();
      
      if (!this.rooms[roomId]) {
        return {
          success: false,
          error: 'Room does not exist'
        };
      }
      
      // Find the user in the room
      const userIndex = this.rooms[roomId].users.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        this.rooms[roomId].users.splice(userIndex, 1);
        this._log(`User ${userId} left room ${roomId}`);
        
        // Add leave event to signal processing
        if (!this.rooms[roomId].events) {
          this.rooms[roomId].events = [];
        }
        
        this.rooms[roomId].events.push({
          type: 'user-left',
          userId,
          timestamp: new Date().toISOString(),
          eventId: this._getNextEventId()
        });
        
        // Remove room if empty
        if (this.rooms[roomId].users.length === 0) {
          // Track the room as closed but don't delete right away
          // This allows clients to see room closed status
          this.rooms[roomId].closed = true;
          this.rooms[roomId].closedAt = new Date().toISOString();
          
          // Schedule actual deletion after a delay
          setTimeout(() => {
            if (this.rooms[roomId]?.closed) {
              delete this.rooms[roomId];
              this._log(`Room ${roomId} deleted (empty)`);
            }
          }, 60000); // Keep closed rooms for 1 minute
        }
      }
      
      return {
        success: true
      };
    } catch (error) {
      this._log('Error leaving room:', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get the status of a room
   * @param {string} roomId - ID of the room
   * @returns {Promise<{success: boolean, roomId: string, participants: number, users: string[], error: string}>}
   */
  async getRoomStatus(roomId) {
    // Validate parameters first - this should throw errors as required by the tests
    if (!roomId) {
      throw new Error('Room ID is required');
    }
    
    if (typeof roomId !== 'string') {
      throw new Error('Room ID must be a string');
    }
    
    if (roomId.trim() === '') {
      throw new Error('Room ID cannot be empty');
    }
    
    try {
      await this._delay();
      this._simulateRandomFailures();
      
      if (!this.rooms[roomId]) {
        return {
          success: false,
          error: 'Room does not exist'
        };
      }
      
      // Check if room is closed
      if (this.rooms[roomId].closed) {
        return {
          success: false,
          error: 'Room is closed',
          closed: true,
          closedAt: this.rooms[roomId].closedAt
        };
      }
      
      // Extract user IDs from room users
      const userIds = this.rooms[roomId].users.map(u => u.id);
      
      return {
        success: true,
        roomId,
        participants: userIds.length,
        users: userIds,
        createdAt: this.rooms[roomId].createdAt,
        metadata: this.rooms[roomId].metadata || {}
      };
    } catch (error) {
      this._log('Error getting room status:', error.message);
      
      return {
        success: false,
        error: error.message
      };
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
    // Validate parameters first - this should throw errors as required by the tests
    if (!roomId) {
      throw new Error('Room ID is required');
    }
    
    if (typeof roomId !== 'string') {
      throw new Error('Room ID must be a string');
    }
    
    if (roomId.trim() === '') {
      throw new Error('Room ID cannot be empty');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (typeof userId !== 'string') {
      throw new Error('User ID must be a string');
    }
    
    if (userId.trim() === '') {
      throw new Error('User ID cannot be empty');
    }
    
    if (!targetId) {
      throw new Error('User ID is required');
    }
    
    if (typeof targetId !== 'string') {
      throw new Error('User ID must be a string');
    }
    
    if (targetId.trim() === '') {
      throw new Error('User ID cannot be empty');
    }
    
    if (!signal) {
      throw new Error('Signal data is required');
    }
    
    if (typeof signal !== 'object') {
      throw new Error('Signal data must be an object');
    }
    
    if (!signal.type) {
      throw new Error('Signal must have a type');
    }
    
    try {
      await this._delay();
      this._simulateRandomFailures();
      
      if (!this.rooms[roomId]) {
        return {
          success: false,
          error: 'Room does not exist'
        };
      }
      
      // Check if room is closed
      if (this.rooms[roomId].closed) {
        return {
          success: false,
          error: 'Room is closed'
        };
      }
      
      // Check if sender is in room
      const senderExists = this.rooms[roomId].users.some(u => u.id === userId);
      if (!senderExists) {
        return {
          success: false,
          error: 'Sender not in room'
        };
      }
      
      // Check if target is in room
      const targetExists = this.rooms[roomId].users.some(u => u.id === targetId);
      if (!targetExists) {
        return {
          success: false,
          error: 'Target not in room'
        };
      }
      
      // Initialize signals array for the room if needed
      if (!this.rooms[roomId].signals) {
        this.rooms[roomId].signals = [];
      }
      
      // Create a new signal object with event ID for pagination
      const signalObj = {
        id: this._generateId(),
        from: userId,
        to: targetId,
        signal,
        timestamp: new Date().toISOString(),
        eventId: this._getNextEventId(),
        processed: false
      };
      
      // Store the signal
      this.rooms[roomId].signals.push(signalObj);
      
      this._log(`Signal from ${userId} to ${targetId} in room ${roomId}`);
      
      return {
        success: true,
        id: signalObj.id
      };
    } catch (error) {
      this._log('Error sending signal:', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get pending signals for a user
   * @param {string} roomId - ID of the room
   * @param {string} userId - ID of the user
   * @param {Object} [options] - Options for getting signals
   * @param {string|number} [options.since] - Get signals since this event ID or timestamp
   * @returns {Promise<{success: boolean, signals: Array<{from: string, signal: object, timestamp: string}>, error: string}>}
   */
  async getSignals(roomId, userId, options = {}) {
    // Validate parameters first - this should throw errors as required by the tests
    if (!roomId) {
      throw new Error('Room ID is required');
    }
    
    if (typeof roomId !== 'string') {
      throw new Error('Room ID must be a string');
    }
    
    if (roomId.trim() === '') {
      throw new Error('Room ID cannot be empty');
    }
    
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (typeof userId !== 'string') {
      throw new Error('User ID must be a string');
    }
    
    if (userId.trim() === '') {
      throw new Error('User ID cannot be empty');
    }
    
    try {
      await this._delay();
      this._simulateRandomFailures();
      
      if (!this.rooms[roomId]) {
        return {
          success: false,
          error: 'Room does not exist'
        };
      }
      
      // Get minimum event ID to fetch (for pagination)
      let minEventId = 0;
      if (options.since) {
        if (typeof options.since === 'number') {
          minEventId = options.since;
        } else if (/^\d+$/.test(options.since)) {
          minEventId = Number.parseInt(options.since, 10);
        } else {
          // Try to parse as ISO timestamp and find nearest event
          const timestamp = new Date(options.since).getTime();
          if (!Number.isNaN(timestamp)) {
            // Find events that occurred after this timestamp
            // For simplicity, we just set minEventId to eventCounter - 100
            // A real implementation would be more sophisticated
            minEventId = Math.max(0, this.eventCounter - 100);
          }
        }
      }
      
      if (!this.rooms[roomId].signals) {
        return {
          success: true,
          signals: [],
          lastEventId: this.eventCounter
        };
      }
      
      // Get unprocessed signals for this user that are newer than minEventId
      const signals = [];
      let maxEventId = minEventId;
      
      for (const signal of this.rooms[roomId].signals) {
        if (signal.to === userId && !signal.processed && signal.eventId > minEventId) {
          signals.push({
            id: signal.id,
            from: signal.from,
            signal: signal.signal,
            timestamp: signal.timestamp,
            eventId: signal.eventId
          });
          signal.processed = true;
          
          // Track highest event ID for cursor-based pagination
          maxEventId = Math.max(maxEventId, signal.eventId);
        }
      }
      
      // Clean up old processed signals
      if (this.rooms[roomId].signals.length > 1000) {
        // Keep only the most recent 500 processed signals
        const signalsCopy = [...this.rooms[roomId].signals];
        signalsCopy.sort((a, b) => {
          // Sort by processed (unprocessed first), then by eventId (newest first)
          if (a.processed !== b.processed) return a.processed ? 1 : -1;
          return b.eventId - a.eventId;
        });
        
        this.rooms[roomId].signals = signalsCopy.slice(0, 500);
      }
      
      this._log(`Retrieved ${signals.length} signals for ${userId} in room ${roomId}`);
      
      return {
        success: true,
        signals,
        lastEventId: this.eventCounter
      };
    } catch (error) {
      this._log('Error getting signals:', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Simulates connection problems (for testing reconnection logic)
   * @param {boolean} isConnected - Whether the client should be connected
   */
  simulateConnectionStatus(isConnected) {
    const wasConnected = this._isConnected;
    this._isConnected = isConnected;
    
    if (wasConnected && !this._isConnected) {
      this._log('Simulating connection loss');
    } else if (!wasConnected && this._isConnected) {
      this._log('Simulating connection restoration');
    }
    
    return this._isConnected;
  }
}