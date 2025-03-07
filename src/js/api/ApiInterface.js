/**
 * API Interface defining all backend operations
 * Any backend implementation must conform to this interface.
 * 
 * @abstract This is an abstract class that should be extended by concrete implementations
 * @see FlaskApiClient for Flask implementation
 * @see MockApiClient for in-memory mock implementation
 */
export default class ApiInterface {
  /**
   * Creates a new instance of ApiInterface
   * @param {Object} options - Configuration options
   * @param {number} [options.defaultTimeout=30000] - Default timeout in milliseconds for API requests
   * @param {number} [options.maxRetries=3] - Maximum number of retries for failed requests
   */
  constructor(options = {}) {
    this.defaultTimeout = options.defaultTimeout || 30000;
    this.maxRetries = options.maxRetries || 3;
    
    /**
     * @protected Stores the backend type identifier
     * @type {string}
     */
    this._backendType = 'abstract';
    
    /**
     * @protected Stores whether the client is currently connected
     * @type {boolean}
     */
    this._isConnected = false;
    
    if (new.target === ApiInterface) {
      throw new TypeError('Cannot instantiate abstract ApiInterface directly');
    }
  }
  
  /**
   * Gets the backend type identifier
   * @returns {string} The backend type
   */
  getBackendType() {
    return this._backendType;
  }
  
  /**
   * Gets the connection status
   * @returns {boolean} True if connected, false otherwise
   */
  isConnected() {
    return this._isConnected;
  }
  
  /**
   * Validates room ID format
   * @param {string} roomId - Room ID to validate
   * @throws {Error} If room ID is invalid
   * @protected
   */
  _validateRoomId(roomId) {
    if (!roomId) {
      throw new Error('Room ID is required');
    }
    
    if (typeof roomId !== 'string') {
      throw new Error('Room ID must be a string');
    }
    
    if (roomId.trim() === '') {
      throw new Error('Room ID cannot be empty');
    }
  }
  
  /**
   * Validates user ID format
   * @param {string} userId - User ID to validate
   * @throws {Error} If user ID is invalid
   * @protected
   */
  _validateUserId(userId) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (typeof userId !== 'string') {
      throw new Error('User ID must be a string');
    }
    
    if (userId.trim() === '') {
      throw new Error('User ID cannot be empty');
    }
  }
  
  /**
   * Validates signal data
   * @param {Object} signal - Signal data to validate
   * @throws {Error} If signal data is invalid
   * @protected
   */
  _validateSignal(signal) {
    if (!signal) {
      throw new Error('Signal data is required');
    }
    
    if (typeof signal !== 'object') {
      throw new Error('Signal data must be an object');
    }
    
    if (!signal.type) {
      throw new Error('Signal must have a type');
    }
  }
  
  /**
   * Create a new room
   * @param {Object} [options] - Options for creating the room
   * @param {Object} [options.metadata] - Optional metadata for the room
   * @returns {Promise<{success: boolean, roomId: string, error: string}>}
   * @throws {Error} If the request fails
   */
  async createRoom(options = {}) {
    throw new Error('Not implemented');
  }

  /**
   * Join an existing room
   * @param {string} roomId - ID of the room to join
   * @param {Object} [options] - Options for joining the room
   * @param {Object} [options.metadata] - Optional metadata for the user
   * @returns {Promise<{success: boolean, roomId: string, userId: string, participants: number, error: string}>}
   * @throws {Error} If roomId is invalid or the request fails
   */
  async joinRoom(roomId, options = {}) {
    this._validateRoomId(roomId);
    throw new Error('Not implemented');
  }

  /**
   * Leave a room
   * @param {string} roomId - ID of the room to leave
   * @param {string} userId - ID of the user leaving
   * @returns {Promise<{success: boolean, error: string}>}
   * @throws {Error} If roomId or userId is invalid or the request fails
   */
  async leaveRoom(roomId, userId) {
    this._validateRoomId(roomId);
    this._validateUserId(userId);
    throw new Error('Not implemented');
  }

  /**
   * Get the status of a room
   * @param {string} roomId - ID of the room
   * @returns {Promise<{success: boolean, roomId: string, participants: number, users: string[], error: string}>}
   * @throws {Error} If roomId is invalid or the request fails
   */
  async getRoomStatus(roomId) {
    this._validateRoomId(roomId);
    throw new Error('Not implemented');
  }

  /**
   * Send a WebRTC signal to another user
   * @param {string} roomId - ID of the room
   * @param {string} userId - ID of the user sending the signal
   * @param {string} targetId - ID of the user to receive the signal
   * @param {object} signal - WebRTC signal data
   * @returns {Promise<{success: boolean, error: string}>}
   * @throws {Error} If any parameter is invalid or the request fails
   */
  async sendSignal(roomId, userId, targetId, signal) {
    this._validateRoomId(roomId);
    this._validateUserId(userId);
    this._validateUserId(targetId);
    this._validateSignal(signal);
    throw new Error('Not implemented');
  }

  /**
   * Get pending signals for a user
   * @param {string} roomId - ID of the room
   * @param {string} userId - ID of the user
   * @param {Object} [options] - Options for getting signals
   * @param {string} [options.since] - Get signals since this timestamp or cursor
   * @returns {Promise<{success: boolean, signals: Array<{from: string, signal: object}>, error: string}>}
   * @throws {Error} If roomId or userId is invalid or the request fails
   */
  async getSignals(roomId, userId, options = {}) {
    this._validateRoomId(roomId);
    this._validateUserId(userId);
    throw new Error('Not implemented');
  }
}