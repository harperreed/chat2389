import FlaskApiClient from './FlaskApiClient.js';
import MockApiClient from './MockApiClient.js';
import PocketBaseApiClient from './PocketBaseApiClient.js';
import FirebaseApiClient from './FirebaseApiClient.js';
import { BACKENDS, loadConfig } from './config.js';

/**
 * API client store that manages instances of API clients.
 * Uses a WeakMap to allow garbage collection when no references to the client remain.
 * @private
 */
class ApiClientStore {
  constructor() {
    // Store client instances by backend type
    this.clients = new Map();
    // Store listeners for client events
    this.listeners = new Map();
    
    // Debug mode
    this.debug = false;
  }
  
  /**
   * Enable or disable debug logging
   * @param {boolean} enabled - Whether to enable debug logs
   */
  setDebug(enabled) {
    this.debug = enabled;
  }
  
  /**
   * Log debug information if enabled
   * @param {...any} args - Arguments to log
   * @private
   */
  _log(...args) {
    if (this.debug) {
      console.debug('[ApiProvider]', ...args);
    }
  }
  
  /**
   * Get a client by type, creating it if needed
   * @param {string} type - Client type
   * @param {Object} options - Options for creating the client
   * @returns {ApiInterface} The API client
   */
  getClient(type, options) {
    // Check if we already have a client of this type
    if (this.clients.has(type)) {
      this._log(`Returning existing ${type} client`);
      return this.clients.get(type);
    }
    
    // Create new client instance
    let client = null;
    
    // Create based on type
    switch (type.toLowerCase()) {
      case BACKENDS.FLASK:
        client = new FlaskApiClient(options.baseUrl || '', {
          defaultTimeout: options.defaultTimeout,
          maxRetries: options.maxRetries,
          retryDelay: options.retryDelay,
          debug: options.debug,
          enableHealthCheck: options.enableHealthCheck
        });
        break;
      case BACKENDS.POCKETBASE:
        client = new PocketBaseApiClient(options.baseUrl || '', {
          defaultTimeout: options.defaultTimeout,
          maxRetries: options.maxRetries,
          debug: options.debug,
          enableHealthCheck: options.enableHealthCheck
        });
        break;
      case BACKENDS.FIREBASE:
        client = new FirebaseApiClient(options.firebaseConfig || {
          apiKey: options.apiKey,
          authDomain: options.authDomain,
          projectId: options.projectId,
          storageBucket: options.storageBucket,
          messagingSenderId: options.messagingSenderId,
          appId: options.appId
        }, {
          defaultTimeout: options.defaultTimeout,
          maxRetries: options.maxRetries,
          debug: options.debug,
          enableHealthCheck: options.enableHealthCheck
        });
        break;
      case BACKENDS.MOCK:
        client = new MockApiClient({
          delayMs: options.mockDelay || 100,
          debug: options.debug,
          failRate: options.mockFailRate || 0,
          initialData: options.mockData
        });
        break;
      // Add more backend implementations here as they're created
      default:
        throw new Error(`Unknown API client type: ${type}`);
    }
    
    // Add connection status handlers if supported
    if (typeof client.onConnectionLost === 'function') {
      client.onConnectionLost = () => {
        this._notifyListeners('connectionLost', { type });
      };
    }
    
    if (typeof client.onConnectionRestored === 'function') {
      client.onConnectionRestored = () => {
        this._notifyListeners('connectionRestored', { type });
      };
    }
    
    // Store the client
    this.clients.set(type, client);
    this._log(`Created new ${type} client`);
    
    return client;
  }
  
  /**
   * Clear a specific client type
   * @param {string} type - Client type to clear
   * @returns {boolean} True if a client was removed
   */
  clearClient(type) {
    if (this.clients.has(type)) {
      const client = this.clients.get(type);
      
      // Cleanup if the client supports it
      if (client && typeof client.destroy === 'function') {
        client.destroy();
      }
      
      this.clients.delete(type);
      this._log(`Cleared ${type} client`);
      return true;
    }
    return false;
  }
  
  /**
   * Clear all clients
   */
  clearAllClients() {
    for (const [type, client] of this.clients.entries()) {
      // Cleanup if the client supports it
      if (client && typeof client.destroy === 'function') {
        client.destroy();
      }
      
      this._log(`Cleared ${type} client`);
    }
    this.clients.clear();
  }
  
  /**
   * Determine the type of a client instance
   * @param {ApiInterface} client - The client to check
   * @returns {string|null} Client type or null if not found
   */
  getClientType(client) {
    // Check each client store to find a match
    for (const [type, storedClient] of this.clients.entries()) {
      if (client === storedClient) {
        return type;
      }
    }
    
    // If still not found, check instance types
    if (client instanceof FlaskApiClient) {
      return BACKENDS.FLASK;
    }
    
    if (client instanceof PocketBaseApiClient) {
      return BACKENDS.POCKETBASE;
    }
    
    if (client instanceof FirebaseApiClient) {
      return BACKENDS.FIREBASE;
    }
    
    if (client instanceof MockApiClient) {
      return BACKENDS.MOCK;
    }
    
    return null;
  }
  
  /**
   * Add a listener for API client events
   * @param {string} event - Event type
   * @param {Function} callback - Callback function
   * @returns {string} Listener ID for removal
   */
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Map());
    }
    
    const id = `listener_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.listeners.get(event).set(id, callback);
    return id;
  }
  
  /**
   * Remove a listener by ID
   * @param {string} id - Listener ID
   * @returns {boolean} True if removed
   */
  removeListener(id) {
    for (const listeners of this.listeners.values()) {
      if (listeners.has(id)) {
        listeners.delete(id);
        return true;
      }
    }
    return false;
  }
  
  /**
   * Notify all listeners of an event
   * @param {string} event - Event type
   * @param {Object} data - Event data
   * @private
   */
  _notifyListeners(event, data) {
    if (!this.listeners.has(event)) return;
    
    for (const callback of this.listeners.get(event).values()) {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in API ${event} listener:`, error);
      }
    }
  }
}

// Create a singleton instance of the client store
const clientStore = new ApiClientStore();

/**
 * ApiProvider functions provide access to API client instances.
 * They manage creating, caching, and accessing API clients 
 * of different types (Flask, Mock, etc.)
 */

/**
 * Get the API client instance
 * @param {string} [type] - Backend type (from BACKENDS object)
 * @param {object} [options] - Options for the API client
 * @returns {ApiInterface} API client instance
 * @throws {Error} If the backend type is unknown
 */
export function getClient(type = null, options = {}) {
  try {
    // If no type provided, load from config
    let clientType = type;
    let clientOptions = options;
    
    if (!clientType) {
      const config = loadConfig();
      clientType = config.type;
      clientOptions = { ...config, ...options };
    }
    
    // Get/create client from store
    return clientStore.getClient(clientType, clientOptions);
  } catch (error) {
    console.error('Error creating API client:', error);
    
    // Fall back to Flask if there's an error
    if (clientType !== BACKENDS.FLASK) {
      console.warn(`Falling back to ${BACKENDS.FLASK} API client`);
      return clientStore.getClient(BACKENDS.FLASK, clientOptions);
    }
    
    throw error;
  }
}

/**
 * Reset a specific API client instance
 * @param {string} [type] - Backend type to reset, or all if not specified
 */
export function resetClient(type = null) {
  if (type) {
    clientStore.clearClient(type);
  } else {
    clientStore.clearAllClients();
  }
}

/**
 * Get the current backend type of a client
 * @param {ApiInterface} [client] - Client instance to check, or current client if not specified
 * @returns {string} Current backend type
 */
export function getClientType(client = null) {
  if (client) {
    return clientStore.getClientType(client);
  }
  
  // If client isn't specified, return the type from the API interface
  const apiClient = getClient();
  return apiClient.getBackendType();
}

/**
 * Enable debug mode for the API provider
 * @param {boolean} [enabled=true] - Whether to enable debugging
 */
export function enableDebug(enabled = true) {
  clientStore.setDebug(enabled);
}

/**
 * Add an event listener for API events
 * @param {string} event - Event name (connectionLost, connectionRestored)
 * @param {Function} callback - Callback function
 * @returns {string} Listener ID for removal
 */
export function addEventListener(event, callback) {
  return clientStore.addListener(event, callback);
}

/**
 * Remove an event listener
 * @param {string} listenerId - ID returned from addEventListener
 * @returns {boolean} True if listener was removed
 */
export function removeEventListener(listenerId) {
  return clientStore.removeListener(listenerId);
}

// Create a default export for backwards compatibility
const ApiProvider = {
  getClient,
  resetClient,
  getClientType,
  enableDebug,
  addEventListener,
  removeEventListener
};

export default ApiProvider;

/**
 * Determine the API client type based on configuration
 * @param {Object} [overrideOptions] - Options to override the default config
 * @returns {string} API client type from BACKENDS
 */
export function determineApiClientType(overrideOptions = {}) {
  const config = loadConfig();
  return overrideOptions.type || config.type;
}