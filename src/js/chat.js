/**
 * Chat manager for handling text messages between peers
 */
export default class ChatManager {
    constructor(webrtcManager) {
        this.webrtcManager = webrtcManager;
        this.messages = [];
        this.onMessageCallbacks = [];
    }
    
    /**
     * Initialize chat functionality
     */
    initialize() {
        // Add a special chat data channel to all peer connections
        this.webrtcManager.onNewPeerConnection((peerId, pc) => {
            this.setupChatChannel(peerId, pc);
        });
        
        // Set up chat channels for existing peer connections
        for (const peerId in this.webrtcManager.peerConnections) {
            this.setupChatChannel(peerId, this.webrtcManager.peerConnections[peerId]);
        }
    }
    
    /**
     * Register callback function to be called when a message is received
     */
    onMessage(callback) {
        this.onMessageCallbacks.push(callback);
    }
    
    /**
     * Set up a data channel for chat on a peer connection
     */
    setupChatChannel(peerId, peerConnection) {
        try {
            const dataChannel = peerConnection.createDataChannel('chat', {
                ordered: true
            });
            
            dataChannel.onmessage = event => {
                try {
                    const message = JSON.parse(event.data);
                    this.receiveMessage(peerId, message);
                } catch (error) {
                    console.error('Error parsing chat message:', error);
                }
            };
            
            dataChannel.onopen = () => {
                console.debug(`Chat data channel opened for peer ${peerId}`);
            };
            
            dataChannel.onclose = () => {
                console.debug(`Chat data channel closed for peer ${peerId}`);
            };
            
            peerConnection.chatChannel = dataChannel;
        } catch (error) {
            console.error('Error setting up chat data channel:', error);
        }
        
        // Handle incoming data channels
        peerConnection.ondatachannel = event => {
            const dataChannel = event.channel;
            
            if (dataChannel.label === 'chat') {
                dataChannel.onmessage = event => {
                    try {
                        const message = JSON.parse(event.data);
                        this.receiveMessage(peerId, message);
                    } catch (error) {
                        console.error('Error parsing chat message:', error);
                    }
                };
                
                peerConnection.chatChannel = dataChannel;
                console.debug(`Received chat data channel from peer ${peerId}`);
            }
        };
    }
    
    /**
     * Send a message to all connected peers
     */
    sendMessage(content) {
        if (!content || content.trim() === '') return;
        
        const message = {
            id: Date.now().toString(),
            sender: this.webrtcManager.userId,
            content: content,
            timestamp: new Date().toISOString()
        };
        
        // Store the message locally
        this.messages.push(message);
        
        // Trigger local message callbacks
        this.onMessageCallbacks.forEach(callback => callback(message, true));
        
        // Broadcast to all peers
        for (const peerId in this.webrtcManager.peerConnections) {
            const pc = this.webrtcManager.peerConnections[peerId];
            
            if (pc.chatChannel && pc.chatChannel.readyState === 'open') {
                pc.chatChannel.send(JSON.stringify(message));
            }
        }
    }
    
    /**
     * Handle an incoming message from a peer
     */
    receiveMessage(peerId, message) {
        // Store the message
        this.messages.push(message);
        
        // Trigger message callbacks
        this.onMessageCallbacks.forEach(callback => callback(message, false));
    }
    
    /**
     * Get all messages
     */
    getMessages() {
        return this.messages;
    }
}