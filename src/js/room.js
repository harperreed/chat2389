import '../css/room.css';
import SignalingManager from './signaling.js';
import WebRTCManager from './webrtc.js';
import MediaManager from './media.js';
import ChatManager from './chat.js';
import BackendSelector from './api/BackendSelector.js';
import ApiProvider from './api/ApiProvider.js';
import { loadConfig } from './api/config.js';

document.addEventListener('DOMContentLoaded', async function() {
    // Get room ID from the template or URL
    let roomId;
    const roomIdElement = document.getElementById('roomIdText');
    
    if (roomIdElement && roomIdElement.textContent.trim() !== '{{ room_id }}') {
        // Get from template variable if it was properly replaced
        roomId = roomIdElement.textContent.trim();
    } else {
        // Otherwise parse from URL path
        const pathParts = window.location.pathname.split('/');
        roomId = pathParts[pathParts.length - 1];
    }
    
    console.debug(`Using room ID: ${roomId}`);
    
    // UI elements
    const roomStatus = document.getElementById('roomStatus');
    const videoGrid = document.getElementById('videoGrid');
    const localVideo = document.getElementById('localVideo');
    const toggleAudioBtn = document.getElementById('toggleAudioBtn');
    const toggleVideoBtn = document.getElementById('toggleVideoBtn');
    const shareScreenBtn = document.getElementById('shareScreenBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');
    const copyRoomIdBtn = document.getElementById('copyRoomId');
    
    // Chat elements
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    
    // Media settings dialog
    const devicesDialog = document.getElementById('devices-dialog');
    const closeDialogBtn = document.getElementById('closeDialog');
    const audioInputSelect = document.getElementById('audioInput');
    const videoInputSelect = document.getElementById('videoInput');
    const audioOutputSelect = document.getElementById('audioOutput');
    const applyDeviceSelectionBtn = document.getElementById('applyDeviceSelection');
    const cancelDeviceSelectionBtn = document.getElementById('cancelDeviceSelection');
    
    // Initialize managers
    const signalingManager = new SignalingManager(roomId);
    let webrtcManager;
    const mediaManager = new MediaManager();
    let chatManager;
    
    // Join room and set up WebRTC
    async function joinRoom() {
        roomStatus.textContent = "Joining room...";
        
        const joinResult = await signalingManager.joinRoom();
        
        if (joinResult.success) {
            roomStatus.textContent = `Connected (${joinResult.participants} participant${joinResult.participants !== 1 ? 's' : ''})`;
            
            // Set up WebRTC with the user ID
            webrtcManager = new WebRTCManager(roomId, joinResult.userId);
            
            // Get the WebRTC manager to use our signaling channel
            signalingManager.onSignal((fromId, signal) => {
                webrtcManager.handleSignal(fromId, signal);
            });
            
            // Override the WebRTC manager's signaling function
            webrtcManager.sendSignal = (targetId, signal) => {
                signalingManager.sendSignal(targetId, signal);
            };
            
            // Set up media
            await setupMedia();
            
            // Handle remote streams
            webrtcManager.onTrack((peerId, stream) => {
                createRemoteVideo(peerId, stream);
            });
            
            // Handle peer disconnections
            webrtcManager.onDisconnect((peerId) => {
                removeRemoteVideo(peerId);
            });
            
            // Set up chat
            chatManager = new ChatManager(webrtcManager);
            chatManager.initialize();
            
            // Handle incoming chat messages
            chatManager.onMessage((message, isLocal) => {
                displayChatMessage(message, isLocal);
            });
            
            // Get room status to discover peers
            const statusResult = await signalingManager.getRoomStatus();
            
            if (statusResult.success) {
                // Connect to all other users in the room
                statusResult.users.forEach(userId => {
                    if (userId !== joinResult.userId) {
                        webrtcManager.createOffer(userId);
                    }
                });
            }
            
            // Set up periodic status updates
            setInterval(() => {
                signalingManager.getRoomStatus().then(result => {
                    if (result.success) {
                        roomStatus.textContent = `Connected (${result.participants} participant${result.participants !== 1 ? 's' : ''})`;
                    }
                });
            }, 5000);
        } else {
            roomStatus.textContent = "Failed to join room";
            alert(`Failed to join room: ${joinResult.error}`);
        }
    }
    
    // Set up local media streams
    async function setupMedia() {
        try {
            await mediaManager.initialize();
            
            const stream = mediaManager.getStream();
            
            if (stream) {
                // Set local video
                localVideo.srcObject = stream;
                
                // Set the stream in the WebRTC manager
                webrtcManager.setLocalStream(stream);
                
                // Update UI based on available tracks
                updateMediaUI();
            } else {
                console.error('Failed to get media stream');
            }
        } catch (error) {
            console.error('Error setting up media:', error);
        }
    }
    
    // Update UI based on media state
    function updateMediaUI() {
        const stream = mediaManager.getStream();
        
        if (!stream) return;
        
        const hasAudio = stream.getAudioTracks().length > 0;
        const hasVideo = stream.getVideoTracks().length > 0;
        
        toggleAudioBtn.textContent = mediaManager.audioEnabled ? 'Mute' : 'Unmute';
        toggleAudioBtn.disabled = !hasAudio;
        
        toggleVideoBtn.textContent = mediaManager.videoEnabled ? 'Disable Video' : 'Enable Video';
        toggleVideoBtn.disabled = !hasVideo;
    }
    
    // Create a video element for a remote peer
    function createRemoteVideo(peerId, stream) {
        // Check if we already have a video for this peer
        let container = document.getElementById(`video-${peerId}`);
        
        if (!container) {
            // Create new video container
            container = document.createElement('div');
            container.id = `video-${peerId}`;
            container.className = 'video-container';
            
            const video = document.createElement('video');
            video.autoplay = true;
            video.playsInline = true;
            
            const label = document.createElement('div');
            label.className = 'video-label';
            label.textContent = `Peer ${peerId.substring(0, 4)}`;
            
            container.appendChild(video);
            container.appendChild(label);
            videoGrid.appendChild(container);
        }
        
        // Set or update the stream
        const video = container.querySelector('video');
        video.srcObject = stream;
    }
    
    // Remove a remote peer's video
    function removeRemoteVideo(peerId) {
        const container = document.getElementById(`video-${peerId}`);
        
        if (container) {
            videoGrid.removeChild(container);
        }
    }
    
    // Display a chat message
    function displayChatMessage(message, isLocal) {
        const messageEl = document.createElement('div');
        messageEl.className = `message ${isLocal ? 'local' : 'remote'}`;
        
        const senderEl = document.createElement('div');
        senderEl.className = 'sender';
        senderEl.textContent = isLocal ? 'You' : `Peer ${message.sender.substring(0, 4)}`;
        
        const contentEl = document.createElement('div');
        contentEl.className = 'content';
        contentEl.textContent = message.content;
        
        const timestampEl = document.createElement('div');
        timestampEl.className = 'timestamp';
        timestampEl.textContent = new Date(message.timestamp).toLocaleTimeString();
        
        messageEl.appendChild(senderEl);
        messageEl.appendChild(contentEl);
        messageEl.appendChild(timestampEl);
        
        chatMessages.appendChild(messageEl);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // Populate device select elements
    function populateDeviceSelects() {
        const devices = mediaManager.devices;
        
        // Clear existing options
        audioInputSelect.innerHTML = '';
        videoInputSelect.innerHTML = '';
        audioOutputSelect.innerHTML = '';
        
        // Add audio input devices
        devices.audioinput.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.text = device.label;
            audioInputSelect.add(option);
        });
        
        // Add video input devices
        devices.videoinput.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.text = device.label;
            videoInputSelect.add(option);
        });
        
        // Add audio output devices
        devices.audiooutput.forEach(device => {
            const option = document.createElement('option');
            option.value = device.id;
            option.text = device.label;
            audioOutputSelect.add(option);
        });
        
        // Set selected values based on current selections
        if (mediaManager.selectedDevices.audioinput) {
            audioInputSelect.value = mediaManager.selectedDevices.audioinput;
        }
        
        if (mediaManager.selectedDevices.videoinput) {
            videoInputSelect.value = mediaManager.selectedDevices.videoinput;
        }
        
        if (mediaManager.selectedDevices.audiooutput) {
            audioOutputSelect.value = mediaManager.selectedDevices.audiooutput;
        }
    }
    
    // Event listeners
    toggleAudioBtn.addEventListener('click', () => {
        const isEnabled = mediaManager.toggleAudio();
        toggleAudioBtn.textContent = isEnabled ? 'Mute' : 'Unmute';
    });
    
    toggleVideoBtn.addEventListener('click', () => {
        const isEnabled = mediaManager.toggleVideo();
        toggleVideoBtn.textContent = isEnabled ? 'Disable Video' : 'Enable Video';
    });
    
    shareScreenBtn.addEventListener('click', async () => {
        const result = await webrtcManager.toggleScreenSharing();
        
        if (result.active) {
            shareScreenBtn.textContent = 'Stop Sharing';
            
            // Update local video with screen share
            localVideo.srcObject = result.stream;
        } else {
            shareScreenBtn.textContent = 'Share Screen';
            
            // Restore camera video
            localVideo.srcObject = mediaManager.getStream();
        }
    });
    
    settingsBtn.addEventListener('click', () => {
        populateDeviceSelects();
        devicesDialog.classList.remove('hidden');
    });
    
    closeDialogBtn.addEventListener('click', () => {
        devicesDialog.classList.add('hidden');
    });
    
    cancelDeviceSelectionBtn.addEventListener('click', () => {
        devicesDialog.classList.add('hidden');
    });
    
    applyDeviceSelectionBtn.addEventListener('click', async () => {
        // Get selected devices
        const deviceSelections = {
            audioinput: audioInputSelect.value,
            videoinput: videoInputSelect.value,
            audiooutput: audioOutputSelect.value
        };
        
        // Change devices
        const newStream = await mediaManager.changeMediaDevices(deviceSelections);
        
        // Update local video
        localVideo.srcObject = newStream;
        
        // Update WebRTC connections
        webrtcManager.setLocalStream(newStream);
        
        // Update UI
        updateMediaUI();
        
        // Close dialog
        devicesDialog.classList.add('hidden');
    });
    
    leaveRoomBtn.addEventListener('click', async () => {
        // Leave room
        await signalingManager.leaveRoom();
        
        // Clean up media
        mediaManager.cleanup();
        
        // Clean up WebRTC
        webrtcManager.closeAllConnections();
        
        // Redirect to home page
        window.location.href = '/';
    });
    
    copyRoomIdBtn.addEventListener('click', () => {
        // Copy room ID to clipboard
        navigator.clipboard.writeText(roomId)
            .then(() => {
                copyRoomIdBtn.textContent = '✓';
                
                // Update the display if needed
                if (roomIdElement) {
                    roomIdElement.textContent = roomId;
                }
                
                setTimeout(() => {
                    copyRoomIdBtn.textContent = '📋';
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy room ID:', err);
            });
    });
    
    sendMessageBtn.addEventListener('click', () => {
        const message = chatInput.value.trim();
        
        if (message) {
            chatManager.sendMessage(message);
            chatInput.value = '';
        }
    });
    
    chatInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            sendMessageBtn.click();
        }
    });
    
    // Start the application
    joinRoom();
    
    // Get configuration
    const config = loadConfig();
    
    // Initialize API debugging
    ApiProvider.enableDebug(config.debug);
    
    // Initialize backend selector
    const isDevMode = config.environment !== 'production';
    if (isDevMode) {
        const selector = new BackendSelector({ 
            visible: window.location.search.includes('debug=true'),
            position: 'bottom-right',
            reloadOnChange: false,
            onBackendChange: (newConfig) => {
                // Show notification
                const notification = document.createElement('div');
                notification.textContent = `Backend changed to ${newConfig.type}`;
                notification.style.position = 'fixed';
                notification.style.top = '10px';
                notification.style.right = '10px';
                notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                notification.style.color = 'white';
                notification.style.padding = '8px 12px';
                notification.style.borderRadius = '4px';
                notification.style.zIndex = '9999';
                document.body.appendChild(notification);
                
                // Remove after 3 seconds
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 3000);
            }
        });
        
        // Create keyboard shortcut for showing the selector
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+B or Cmd+Shift+B
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'b') {
                selector.toggle();
                e.preventDefault();
            }
        });
    }
});