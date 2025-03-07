/**
 * API Configuration Module
 * 
 * This module handles configuration for backend API clients,
 * supporting:
 *  - Default configurations
 *  - Environment-specific overrides
 *  - URL parameters for testing/development
 *  - Storage of configuration in localStorage
 */

/**
 * Supported API backend types
 * @enum {string}
 */
export const BACKENDS = {
  /**
   * Python Flask backend (default)
   */
  FLASK: 'flask',
  
  /**
   * In-memory mock backend for testing/development
   */
  MOCK: 'mock',
  
  // Add new backend types here as they're implemented
  // NODE: 'node',  // Example for future Node.js backend
  // JAVA: 'java',  // Example for future Java backend
};

/**
 * Environment types for different deployment scenarios
 * @enum {string}
 */
export const ENVIRONMENTS = {
  /**
   * Development environment
   */
  DEVELOPMENT: 'development',
  
  /**
   * Testing environment
   */
  TEST: 'test',
  
  /**
   * Staging environment
   */
  STAGING: 'staging',
  
  /**
   * Production environment
   */
  PRODUCTION: 'production'
};

/**
 * Default backend configuration
 * @type {Object}
 */
export const DEFAULT_CONFIG = {
  /**
   * Backend type to use
   * @type {string}
   */
  type: BACKENDS.FLASK,
  
  /**
   * Base URL for API requests (empty string means same origin)
   * @type {string}
   */
  baseUrl: '',
  
  /**
   * Default request timeout in milliseconds
   * @type {number}
   */
  defaultTimeout: 30000,
  
  /**
   * Maximum number of retries for failed requests
   * @type {number}
   */
  maxRetries: 3,
  
  /**
   * Base delay between retries in milliseconds
   * @type {number}
   */
  retryDelay: 1000,
  
  /**
   * Whether to enable debug logging
   * @type {boolean}
   */
  debug: false,
  
  /**
   * Enable health checks for connection monitoring
   * @type {boolean}
   */
  enableHealthCheck: false,
  
  /**
   * Health check interval in milliseconds
   * @type {number}
   */
  healthCheckInterval: 30000,
  
  /**
   * Mock API specific settings
   */
  mockDelay: 100,          // Simulated network delay
  mockFailRate: 0,         // Rate of random failures (0-1)
  mockData: null,          // Initial mock data
  
  /**
   * Whether to persist configuration in localStorage
   * @type {boolean}
   */
  persistConfig: false,
  
  /**
   * Current environment (development, test, staging, production)
   * @type {string}
   */
  environment: ENVIRONMENTS.PRODUCTION
};

/**
 * Environment-specific configurations that override the defaults
 * @type {Object.<string, Object>}
 */
const ENVIRONMENT_CONFIGS = {
  [ENVIRONMENTS.DEVELOPMENT]: {
    debug: true,
    maxRetries: 1,
    persistConfig: true,
    enableHealthCheck: true
  },
  
  [ENVIRONMENTS.TEST]: {
    type: BACKENDS.MOCK,
    debug: true,
    mockFailRate: 0.1,  // 10% of requests will fail randomly
    persistConfig: false
  },
  
  [ENVIRONMENTS.STAGING]: {
    enableHealthCheck: true,
    maxRetries: 2
  },
  
  [ENVIRONMENTS.PRODUCTION]: {
    debug: false,
    enableHealthCheck: true
  }
};

/**
 * Storage key for persisted configuration
 * @type {string}
 * @private
 */
const STORAGE_KEY = 'webrtc_chat_api_config';

/**
 * Detect the current environment
 * @returns {string} Environment type
 */
function detectEnvironment() {
  // Check for explicit environment setting
  if (window.ENV && window.ENV.ENVIRONMENT) {
    return window.ENV.ENVIRONMENT;
  }
  
  // Check for URL indicators
  const host = window.location.hostname;
  
  if (host === 'localhost' || host === '127.0.0.1' || host.includes('.local')) {
    return ENVIRONMENTS.DEVELOPMENT;
  }
  
  if (host.includes('test.') || host.includes('.test')) {
    return ENVIRONMENTS.TEST;
  }
  
  if (host.includes('staging.') || host.includes('.staging')) {
    return ENVIRONMENTS.STAGING;
  }
  
  // Check for URL params
  const urlParams = new URLSearchParams(window.location.search);
  const envParam = urlParams.get('env');
  
  if (envParam && Object.values(ENVIRONMENTS).includes(envParam)) {
    return envParam;
  }
  
  // Default to production
  return ENVIRONMENTS.PRODUCTION;
}

/**
 * Save configuration to localStorage if enabled
 * @param {Object} config - Configuration to save
 * @private
 */
function saveConfigToStorage(config) {
  if (config.persistConfig) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Failed to save API configuration to localStorage:', e);
    }
  }
}

/**
 * Load configuration from localStorage if available
 * @returns {Object|null} Loaded configuration or null
 * @private
 */
function loadConfigFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load API configuration from localStorage:', e);
  }
  return null;
}

/**
 * Load configuration from all available sources
 * @returns {Object} Merged configuration
 */
export function loadConfig() {
  // Start with default config
  let config = { ...DEFAULT_CONFIG };
  
  // Determine environment
  const environment = detectEnvironment();
  config.environment = environment;
  
  // Apply environment-specific config
  if (ENVIRONMENT_CONFIGS[environment]) {
    config = { ...config, ...ENVIRONMENT_CONFIGS[environment] };
  }
  
  // Apply stored config if persistence is enabled
  if (config.persistConfig) {
    const storedConfig = loadConfigFromStorage();
    if (storedConfig) {
      config = { ...config, ...storedConfig };
    }
  }
  
  // Apply window.ENV settings (highest priority except URL params)
  if (window.ENV && window.ENV.API_CONFIG) {
    config = { ...config, ...window.ENV.API_CONFIG };
  }
  
  // Check for URL parameters (useful for development/testing, highest priority)
  const urlParams = new URLSearchParams(window.location.search);
  
  // Process URL parameters
  if (urlParams.has('api')) {
    config.type = urlParams.get('api');
  }
  
  if (urlParams.has('api-debug')) {
    config.debug = urlParams.get('api-debug') === 'true';
  }
  
  if (urlParams.has('api-timeout')) {
    const timeout = parseInt(urlParams.get('api-timeout'), 10);
    if (!isNaN(timeout)) {
      config.defaultTimeout = timeout;
    }
  }
  
  if (urlParams.has('api-retries')) {
    const retries = parseInt(urlParams.get('api-retries'), 10);
    if (!isNaN(retries)) {
      config.maxRetries = retries;
    }
  }
  
  if (urlParams.has('mock-delay')) {
    const delay = parseInt(urlParams.get('mock-delay'), 10);
    if (!isNaN(delay)) {
      config.mockDelay = delay;
    }
  }
  
  if (urlParams.has('mock-fail')) {
    const rate = parseFloat(urlParams.get('mock-fail'));
    if (!isNaN(rate)) {
      config.mockFailRate = Math.max(0, Math.min(1, rate));
    }
  }
  
  // Save configuration if persistence is enabled
  if (config.persistConfig) {
    saveConfigToStorage(config);
  }
  
  return config;
}

/**
 * Update the current configuration
 * @param {Object} updates - Configuration updates
 * @returns {Object} Updated configuration
 */
export function updateConfig(updates) {
  const currentConfig = loadConfig();
  const newConfig = { ...currentConfig, ...updates };
  
  // Save if persistence is enabled
  if (newConfig.persistConfig) {
    saveConfigToStorage(newConfig);
  }
  
  return newConfig;
}

/**
 * Reset configuration to defaults
 * @param {boolean} [keepEnvironment=true] - Whether to keep environment-specific settings
 * @returns {Object} Reset configuration
 */
export function resetConfig(keepEnvironment = true) {
  // Remove from storage
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to remove API configuration from localStorage:', e);
  }
  
  // Start with defaults
  let config = { ...DEFAULT_CONFIG };
  
  // Apply environment config if keeping environment
  if (keepEnvironment) {
    const environment = detectEnvironment();
    config.environment = environment;
    
    if (ENVIRONMENT_CONFIGS[environment]) {
      config = { ...config, ...ENVIRONMENT_CONFIGS[environment] };
    }
  }
  
  return config;
}