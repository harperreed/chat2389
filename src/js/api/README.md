# Data Access Layer (API) Documentation

This directory contains the Data Access Layer for the WebRTC Video Chat application.
It provides a clean abstraction for backend communication, allowing multiple backend
implementations to be swapped easily.

## Features

- **Multiple Backend Support**: Easily switch between different backend implementations
- **Input Validation**: Comprehensive validation of all parameters before API calls
- **Error Handling**: Robust error handling with retries and timeout management
- **Configurable**: Environment-specific configurations with runtime updates
- **Mock Implementation**: In-memory mock backend for development and testing
- **Health Monitoring**: Connection status tracking with event notifications
- **Developer Tools**: UI widget for configuring backends during development

## Architecture

The Data Access Layer is built on these key components:

1. **ApiInterface**: Abstract class defining the contract for all API clients
2. **Concrete Implementations**: Specific backend adapters (Flask, Mock, etc.)
3. **ApiProvider**: Factory that creates and provides the appropriate client
4. **Configuration**: Manages backend selection and environment-specific settings
5. **Backend Selector**: UI tool for switching backends during development

### Component Diagram

```
┌─────────────┐     ┌───────────────┐     ┌──────────────┐
│ Application │────▶│  ApiProvider  │────▶│ ApiInterface │
└─────────────┘     └───────────────┘     └──────────────┘
                           │                      ▲
                           │                      │
                           ▼                      │
                    ┌─────────────┐       ┌──────┴───────┐
                    │    Config   │       │ Implementation│
                    └─────────────┘       └──────────────┘
                                                  ▲
                                         ┌────────┴────────┐
                                         │                 │
                                   ┌──────────┐    ┌────────────┐
                                   │FlaskApi  │    │  MockApi   │
                                   └──────────┘    └────────────┘
```

### Data Flow

1. Application code requests an API client from the ApiProvider
2. ApiProvider uses the Config to determine which implementation to use
3. ApiProvider creates/returns the appropriate implementation
4. Application uses the implementation through the ApiInterface contract

## Adding a New Backend Implementation

To add a new backend implementation (e.g., Node.js, Go, Java, etc.), follow these steps:

### 1. Create a new implementation file

Create a new file named `[YourBackend]ApiClient.js` that extends the `ApiInterface` class:

```javascript
import ApiInterface from './ApiInterface.js';
import { BACKENDS } from './config.js';

/**
 * YourBackend API client implementation
 */
export default class YourBackendApiClient extends ApiInterface {
  /**
   * Creates a new YourBackend API client
   * @param {string} baseUrl - Base URL for the API
   * @param {Object} options - Additional options
   */
  constructor(baseUrl = '', options = {}) {
    super(options);
    this.baseUrl = baseUrl;
    this._backendType = BACKENDS.YOUR_BACKEND;
  }
  
  /**
   * Create a new room
   * @param {Object} [options] - Options for creating the room
   * @returns {Promise<{success: boolean, roomId: string, error: string}>}
   */
  async createRoom(options = {}) {
    try {
      // Your implementation here
      // Make sure to validate inputs using parent class methods
      // Example: this._validateRoomId(roomId);
      
      // Return standardized response format
      return {
        success: true,
        roomId: "generated-id",
        created: true
      };
    } catch (error) {
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
    try {
      this._validateRoomId(roomId);
      
      // Your implementation here
      
      return {
        success: true,
        roomId: roomId,
        userId: "user-id",
        participants: 1
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  // Implement all other methods from ApiInterface...
}
```

### 2. Update the configuration

Add your backend type to the `BACKENDS` object in `config.js`:

```javascript
export const BACKENDS = {
  FLASK: 'flask',
  MOCK: 'mock',
  YOUR_BACKEND: 'your-backend',  // Add your backend type here
};
```

Configure environment-specific defaults if needed:

```javascript
const ENVIRONMENT_CONFIGS = {
  [ENVIRONMENTS.DEVELOPMENT]: {
    // ...existing settings
    // Add your backend as default for development if desired
    type: BACKENDS.YOUR_BACKEND
  },
}
```

### 3. Register your implementation in the ApiProvider

Update the `getClient` method in the `ApiClientStore` class in `ApiProvider.js`:

```javascript
getClient(type, options) {
  // ...existing code...
  
  switch (type.toLowerCase()) {
    case BACKENDS.FLASK:
      client = new FlaskApiClient(options.baseUrl || '', {
        defaultTimeout: options.defaultTimeout,
        maxRetries: options.maxRetries,
        // ...other options
      });
      break;
    case BACKENDS.MOCK:
      client = new MockApiClient({
        // ...options
      });
      break;
    case BACKENDS.YOUR_BACKEND:  // Add case for your backend
      client = new YourBackendApiClient(options.baseUrl || '', {
        // Pass any specific options needed by your implementation
        yourOption1: options.yourOption1,
        yourOption2: options.yourOption2,
      });
      break;
    default:
      throw new Error(`Unknown API client type: ${type}`);
  }
  
  // ...rest of the method...
}
```

Also update the `getClientType` method to detect your backend:

```javascript
getClientType(client) {
  // ...existing code...
  
  // If still not found, check instance types
  if (client instanceof FlaskApiClient) {
    return BACKENDS.FLASK;
  } else if (client instanceof MockApiClient) {
    return BACKENDS.MOCK;
  } else if (client instanceof YourBackendApiClient) {
    return BACKENDS.YOUR_BACKEND;
  }
  
  return null;
}
```

### 4. Add backend-specific UI options to BackendSelector (optional)

Extend the `_createAdvancedOptions` method in `BackendSelector.js` to include your backend's specific options:

```javascript
// Add your backend specific options
const yourBackendOptions = document.createElement('div');
yourBackendOptions.className = 'backend-specific-options your-backend';
yourBackendOptions.style.display = this.config.type === BACKENDS.YOUR_BACKEND ? 'block' : 'none';

yourBackendOptions.appendChild(createOption(
  'yourOption1',
  'Your Option 1',
  'text',
  this.config.yourOption1 || ''
));

yourBackendOptions.appendChild(createOption(
  'yourOption2',
  'Your Option 2',
  'checkbox',
  this.config.yourOption2 || false
));

specificSection.appendChild(yourBackendOptions);
```

### 5. Test your implementation

You can test your implementation by:

1. **URL Parameters**: Add `?api=your-backend` to the URL
2. **Backend Selector**: Use the UI widget in development mode
3. **Configuration**: Set it in the environment configuration
4. **API**: Call `updateConfig({ type: BACKENDS.YOUR_BACKEND })`

### 6. Document your implementation

Add information about your backend to the main README and update this documentation with any specific details or requirements.

## API Interface Reference

The `ApiInterface` class defines the following methods that must be implemented by any backend adapter:

### Core Methods

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `createRoom()` | `options?: Object` | `Promise<Object>` | Create a new room |
| `joinRoom()` | `roomId: string, options?: Object` | `Promise<Object>` | Join an existing room |
| `leaveRoom()` | `roomId: string, userId: string` | `Promise<Object>` | Leave a room |
| `getRoomStatus()` | `roomId: string` | `Promise<Object>` | Get the status of a room |
| `sendSignal()` | `roomId: string, userId: string, targetId: string, signal: Object` | `Promise<Object>` | Send a WebRTC signal to another user |
| `getSignals()` | `roomId: string, userId: string, options?: Object` | `Promise<Object>` | Get pending signals for a user |

### Utility Methods

| Method | Parameters | Return Type | Description |
|--------|------------|-------------|-------------|
| `getBackendType()` | None | `string` | Get the type of backend implementation |
| `isConnected()` | None | `boolean` | Check if the backend is connected |
| `destroy()` | None | `void` | Clean up resources used by the client |

### Input Validation

The `ApiInterface` provides these protected validation methods:

| Method | Parameters | Description |
|--------|------------|-------------|
| `_validateRoomId()` | `roomId: string` | Validate room ID format |
| `_validateUserId()` | `userId: string` | Validate user ID format |
| `_validateSignal()` | `signal: Object` | Validate signal data |

## Configuration System

The API layer includes a robust configuration system that supports:

### Environment Detection

The system automatically detects the current environment based on:
- Hostname patterns (localhost, .test, .staging, etc.)
- Explicit environment setting in `window.ENV.ENVIRONMENT`
- URL parameters (`?env=development`)

### Configuration Sources (in order of precedence)

1. URL Parameters (`?api=mock`, `?api-debug=true`, etc.)
2. Global ENV object (`window.ENV.API_CONFIG`)
3. Local Storage (if persistence enabled)
4. Environment-specific defaults
5. Base defaults

### Configuration API

| Function | Description |
|----------|-------------|
| `loadConfig()` | Load configuration from all available sources |
| `updateConfig(updates)` | Update the current configuration |
| `resetConfig(keepEnvironment)` | Reset configuration to defaults |

## Backend Selector UI

The `BackendSelector` component provides a UI for managing API backends during development:

### Features

- Switch between backend implementations
- Configure timeouts, retries, and debug mode
- Toggle random failures and delays for testing
- Save settings to localStorage

### Usage

```javascript
// Basic usage
new BackendSelector({ visible: true });

// Advanced usage
const selector = new BackendSelector({
  visible: true,
  position: 'bottom-right',
  showAdvanced: true,
  closeButton: true,
  onBackendChange: (newConfig) => {
    console.log('Backend changed:', newConfig);
  },
  reloadOnChange: false
});

// Use keyboard shortcut Ctrl+Shift+B to show/hide
// Apply changes without reload
selector.applyConfigWithoutReload({
  type: 'mock',
  mockFailRate: 0.2
});
```

### Access Methods

The Backend Selector is available in the global scope during development:

```javascript
// Access from browser console
window._backendSelector.toggle();
window._backendSelector.show();
window._backendSelector.hide();
```