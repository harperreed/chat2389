import ApiInterface from './ApiInterface.js';
import { BACKENDS } from './config.js';

/**
 * Flask API client implementing the ApiInterface
 * for communicating with our Flask backend.
 * 
 * This client handles all HTTP communication with the Flask server,
 * including error handling, retries, and timeouts.
 */
export default class FlaskApiClient extends ApiInterface {
  /**
   * Creates a new Flask API client
   * @param {string} baseUrl - Base URL for the API (empty for same origin)
   * @param {Object} options - Additional options
   * @param {number} [options.defaultTimeout=30000] - Default timeout in milliseconds
   * @param {number} [options.maxRetries=3] - Maximum number of retries for failed requests
   * @param {number} [options.retryDelay=1000] - Base delay between retries in milliseconds
   * @param {boolean} [options.debug=false] - Enable debug logging
   */
  constructor(baseUrl = '', options = {}) {
    super({
      defaultTimeout: options.defaultTimeout || 30000,
      maxRetries: options.maxRetries || 3
    });
    
    this.baseUrl = baseUrl;
    this.retryDelay = options.retryDelay || 1000;
    this.debug = options.debug || false;
    this._backendType = BACKENDS.FLASK;
    this._isConnected = true; // Assume connected initially
    
    // Create a Set to keep track of in-flight requests to prevent duplicates
    this._pendingRequests = new Set();
    
    // If health check is enabled, start it
    if (options.enableHealthCheck) {
      this._startHealthCheck(options.healthCheckInterval || 30000);
    }
    
    this._log('FlaskApiClient initialized');
  }
  
  /**
   * Internal logging method that respects debug setting
   * @param {...any} args - Arguments to log
   * @private
   */
  _log(...args) {
    if (this.debug) {
      console.debug('[FlaskApiClient]', ...args);
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
        const response = await fetch(`${this.baseUrl}/health`, { 
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
   * Make a request to the Flask API
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {object} body - Request body
   * @param {object} [options] - Request options
   * @param {number} [options.timeout] - Request timeout in milliseconds
   * @param {number} [options.retries] - Number of retries for this specific request
   * @param {AbortSignal} [options.signal] - AbortSignal to cancel the request
   * @returns {Promise<object>} Response data
   * @throws {Error} If the request fails after all retries
   * @private
   */
  async _request(endpoint, method = 'GET', body = null, options = {}) {
    const timeout = options.timeout || this.defaultTimeout;
    const retries = options.retries !== undefined ? options.retries : this.maxRetries;
    const requestId = `${method}:${endpoint}:${JSON.stringify(body || {})}`;
    
    // Return a promise that will resolve when the request completes
    return new Promise(async (resolve, reject) => {
      // Check if this exact request is already in flight
      if (this._pendingRequests.has(requestId) && method === 'GET') {
        this._log(`Request already in flight: ${requestId}`);
        reject(new Error('Request already in flight'));
        return;
      }
      
      // Track this request
      this._pendingRequests.add(requestId);
      
      // Try the request with retries
      let lastError = null;
      let attempt = 0;
      
      while (attempt <= retries) {
        try {
          // Create abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          // Combine with user-provided signal if any
          const signal = options.signal
            ? AbortSignal.any([options.signal, controller.signal])
            : controller.signal;
          
          const fetchOptions = {
            method,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            signal
          };

          if (body) {
            fetchOptions.body = JSON.stringify(body);
          }

          // Make the request
          this._log(`Request [${attempt}/${retries}]:`, method, endpoint);
          const response = await fetch(`${this.baseUrl}${endpoint}`, fetchOptions);
          clearTimeout(timeoutId);
          
          // Check for HTTP errors
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`HTTP error ${response.status}: ${errorData.error || response.statusText}`);
          }
          
          // Parse the response
          const data = await response.json();
          
          // Remove from pending requests
          this._pendingRequests.delete(requestId);
          
          // Return the data
          resolve(data);
          return;
        } catch (error) {
          lastError = error;
          
          // If this is an abort error, don't retry
          if (error.name === 'AbortError') {
            this._log(`Request aborted:`, method, endpoint);
            break;
          }
          
          // If we've reached the max retries, give up
          if (attempt >= retries) {
            this._log(`Max retries reached:`, method, endpoint);
            break;
          }
          
          // Otherwise, wait and retry
          const delay = this.retryDelay * Math.pow(2, attempt);
          this._log(`Retrying in ${delay}ms:`, method, endpoint);
          await new Promise(r => setTimeout(r, delay));
          attempt++;
        }
      }
      
      // If we get here, all retries failed
      this._pendingRequests.delete(requestId);
      
      // Create standardized error response
      const errorResponse = {
        success: false,
        error: lastError ? lastError.message : 'Unknown error'
      };
      
      this._log(`Request failed:`, method, endpoint, errorResponse.error);
      resolve(errorResponse); // Resolve with error data instead of rejecting
    });
  }

  /**
   * Create a new room
   * @param {Object} [options] - Options for creating the room
   * @returns {Promise<{success: boolean, roomId: string, error: string}>}
   */
  async createRoom(options = {}) {
    try {
      return await this._request('/api/create-room', 'POST', options.metadata ? { metadata: options.metadata } : null);
    } catch (error) {
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
    // Validate input
    try {
      this._validateRoomId(roomId);
      
      const body = options.metadata ? { metadata: options.metadata } : null;
      return await this._request(`/api/join-room/${roomId}`, 'POST', body);
    } catch (error) {
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
      
      return await this._request('/api/leave-room', 'POST', { roomId, userId });
    } catch (error) {
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
      
      return await this._request(`/api/room-status/${roomId}`);
    } catch (error) {
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
      
      return await this._request('/api/signal', 'POST', {
        roomId,
        userId,
        targetId,
        signal
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending signals for a user
   * @param {string} roomId - ID of the room
   * @param {string} userId - ID of the user
   * @param {Object} [options] - Options for getting signals
   * @param {string} [options.since] - Get signals since this timestamp or cursor
   * @returns {Promise<{success: boolean, signals: Array<{from: string, signal: object}>, error: string}>}
   */
  async getSignals(roomId, userId, options = {}) {
    try {
      this._validateRoomId(roomId);
      this._validateUserId(userId);
      
      const body = { roomId, userId };
      if (options.since) {
        body.since = options.since;
      }
      
      return await this._request('/api/get-signals', 'POST', body);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Cleans up resources used by the client
   */
  destroy() {
    this._stopHealthCheck();
    this._pendingRequests.clear();
  }
}