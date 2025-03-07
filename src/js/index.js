import '../css/index.css';
import ApiProvider from './api/ApiProvider.js';
import BackendSelector from './api/BackendSelector.js';
import { loadConfig } from './api/config.js';

document.addEventListener('DOMContentLoaded', function() {
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const roomIdInput = document.getElementById('roomIdInput');
    
    // Get configuration
    const config = loadConfig();
    
    // Initialize API client with debug mode in development
    ApiProvider.enableDebug(config.debug);
    const apiClient = ApiProvider.getClient();
    
    console.debug(`Using ${apiClient.getBackendType()} API client for home page`);
    
    // Setup UI state tracking
    const uiState = {
        isCreatingRoom: false,
        isJoiningRoom: false,
        roomIdBeingJoined: null
    };
    
    // Add connection status indicator
    const statusIndicator = document.createElement('div');
    statusIndicator.className = 'connection-status';
    statusIndicator.style.position = 'fixed';
    statusIndicator.style.bottom = '10px';
    statusIndicator.style.left = '10px';
    statusIndicator.style.width = '12px';
    statusIndicator.style.height = '12px';
    statusIndicator.style.borderRadius = '50%';
    statusIndicator.style.backgroundColor = apiClient.isConnected() ? '#65B741' : '#FE0000';
    statusIndicator.style.transition = 'background-color 0.3s';
    document.body.appendChild(statusIndicator);
    
    // Listen for connection status changes
    ApiProvider.addEventListener('connectionLost', () => {
        statusIndicator.style.backgroundColor = '#FE0000';
        if (uiState.isCreatingRoom || uiState.isJoiningRoom) {
            alert('Connection to server lost. Please try again.');
            createRoomBtn.disabled = false;
            joinRoomBtn.disabled = false;
            uiState.isCreatingRoom = false;
            uiState.isJoiningRoom = false;
        }
    });
    
    ApiProvider.addEventListener('connectionRestored', () => {
        statusIndicator.style.backgroundColor = '#65B741';
    });
    
    // Create a new room with error handling and retry
    createRoomBtn.addEventListener('click', async function() {
        if (uiState.isCreatingRoom) return; // Prevent double-clicks
        
        console.debug('Creating new room...');
        createRoomBtn.disabled = true;
        uiState.isCreatingRoom = true;
        
        try {
            // Visual feedback
            createRoomBtn.textContent = 'Creating...';
            
            // Call API with proper options
            const data = await apiClient.createRoom({
                metadata: {
                    createdAt: new Date().toISOString(),
                    createdBy: 'web-client'
                }
            });
            
            if (data.success) {
                const roomId = data.roomId;
                console.debug(`Room created with ID: ${roomId}`);
                
                // Store created room ID in sessionStorage for reconnection
                try {
                    sessionStorage.setItem('lastRoomId', roomId);
                } catch (e) {
                    console.warn('Could not store room ID in session storage:', e);
                }
                
                // Redirect to the room
                window.location.href = `/room/${roomId}`;
            } else {
                console.error('Failed to create room:', data.error);
                alert('Failed to create room: ' + data.error);
                createRoomBtn.disabled = false;
                createRoomBtn.textContent = 'Create New Room';
                uiState.isCreatingRoom = false;
            }
        } catch (error) {
            console.error('Error creating room:', error);
            alert('Error creating room. Please try again.');
            createRoomBtn.disabled = false;
            createRoomBtn.textContent = 'Create New Room';
            uiState.isCreatingRoom = false;
        }
    });
    
    // Join an existing room with validation and error handling
    joinRoomBtn.addEventListener('click', async function() {
        if (uiState.isJoiningRoom) return; // Prevent double-clicks
        
        const roomId = roomIdInput.value.trim();
        
        // Room ID validation
        if (!roomId) {
            alert('Please enter a valid Room ID');
            roomIdInput.focus();
            return;
        }
        
        // Additional validation based on expected format (8 chars)
        if (roomId.length !== 8) {
            alert('Room IDs are typically 8 characters long');
            // Don't prevent continuing as this is just a warning
        }
        
        console.debug(`Joining room: ${roomId}`);
        joinRoomBtn.disabled = true;
        uiState.isJoiningRoom = true;
        uiState.roomIdBeingJoined = roomId;
        
        try {
            // Visual feedback
            joinRoomBtn.textContent = 'Joining...';
            
            // Call API with proper options and validation
            const data = await apiClient.joinRoom(roomId, {
                metadata: {
                    joinedAt: new Date().toISOString(),
                    joinedBy: 'web-client'
                }
            });
            
            if (data.success) {
                console.debug(`Successfully joined room ${roomId}`);
                
                // Store joined room ID in sessionStorage for reconnection
                try {
                    sessionStorage.setItem('lastRoomId', roomId);
                    sessionStorage.setItem('lastUserId', data.userId);
                } catch (e) {
                    console.warn('Could not store room/user IDs in session storage:', e);
                }
                
                // Redirect to the room
                window.location.href = `/room/${roomId}`;
            } else {
                console.error('Failed to join room:', data.error);
                alert('Failed to join room: ' + data.error);
                joinRoomBtn.disabled = false;
                joinRoomBtn.textContent = 'Join Room';
                uiState.isJoiningRoom = false;
                uiState.roomIdBeingJoined = null;
                
                // Focus on input for retry
                roomIdInput.focus();
            }
        } catch (error) {
            console.error('Error joining room:', error);
            alert('Error joining room. Please check if the Room ID is correct.');
            joinRoomBtn.disabled = false;
            joinRoomBtn.textContent = 'Join Room';
            uiState.isJoiningRoom = false;
            uiState.roomIdBeingJoined = null;
        }
    });
    
    // Allow pressing Enter to join a room
    roomIdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            joinRoomBtn.click();
        }
    });
    
    // Initialize backend selector in development mode
    const isDevMode = window.location.search.includes('debug=true') || 
                     (window.ENV && window.ENV.DEVELOPMENT === true);
    if (isDevMode) {
        new BackendSelector({ visible: true });
    }
});