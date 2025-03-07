/**
 * WebRTC connection manager for handling peer connections
 */
export default class WebRTCManager {
    constructor(roomId, userId) {
        this.roomId = roomId;
        this.userId = userId;
        this.peerConnections = {};
        this.localStream = null;
        this.screenStream = null;
        this.isScreenSharing = false;
        this.pendingCandidates = {};
        this.onTrackCallbacks = [];
        this.onDisconnectCallbacks = [];
        this.onNewPeerConnectionCallbacks = [];
        
        // Configure ICE servers for STUN/TURN
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        };
    }
    
    /**
     * Set the local media stream
     */
    setLocalStream(stream) {
        this.localStream = stream;
        
        // Add tracks to all existing peer connections
        for (const peerId in this.peerConnections) {
            this.updatePeerTracks(peerId);
        }
    }
    
    /**
     * Register callback function to be called when a remote track is received
     */
    onTrack(callback) {
        this.onTrackCallbacks.push(callback);
    }
    
    /**
     * Register callback function to be called when a peer disconnects
     */
    onDisconnect(callback) {
        this.onDisconnectCallbacks.push(callback);
    }
    
    /**
     * Register callback function to be called when a new peer connection is created
     */
    onNewPeerConnection(callback) {
        this.onNewPeerConnectionCallbacks.push(callback);
    }
    
    /**
     * Update tracks for a specific peer connection
     */
    updatePeerTracks(peerId) {
        if (!this.peerConnections[peerId]) return;
        
        const pc = this.peerConnections[peerId];
        const senders = pc.getSenders();
        
        // Get the current stream (either camera or screen)
        const currentStream = this.isScreenSharing ? this.screenStream : this.localStream;
        if (!currentStream) return;
        
        // Add or replace audio and video tracks
        currentStream.getTracks().forEach(track => {
            const sender = senders.find(s => s.track && s.track.kind === track.kind);
            
            if (sender) {
                // Replace existing track
                sender.replaceTrack(track);
                console.debug(`Replaced ${track.kind} track for peer ${peerId}`);
            } else {
                // Add new track
                pc.addTrack(track, currentStream);
                console.debug(`Added ${track.kind} track for peer ${peerId}`);
            }
        });
    }
    
    /**
     * Create a new peer connection or get existing one
     */
    getPeerConnection(peerId) {
        if (this.peerConnections[peerId]) {
            return this.peerConnections[peerId];
        }
        
        console.debug(`Creating new peer connection for ${peerId}`);
        
        // Create new peer connection
        const pc = new RTCPeerConnection(this.iceServers);
        this.peerConnections[peerId] = pc;
        
        // Trigger new peer connection callbacks
        if (this.onNewPeerConnectionCallbacks.length > 0) {
            this.onNewPeerConnectionCallbacks.forEach(callback => callback(peerId, pc));
        }
        
        // Add local tracks if we have them
        const currentStream = this.isScreenSharing ? this.screenStream : this.localStream;
        if (currentStream) {
            currentStream.getTracks().forEach(track => {
                pc.addTrack(track, currentStream);
                console.debug(`Added ${track.kind} track to new peer connection for ${peerId}`);
            });
        }
        
        // Set up ICE candidate handling
        pc.onicecandidate = event => {
            if (event.candidate) {
                this.sendSignal(peerId, {
                    type: 'ice-candidate',
                    candidate: event.candidate
                });
            }
        };
        
        // Handle ICE connection state changes
        pc.oniceconnectionstatechange = () => {
            console.debug(`ICE state changed to ${pc.iceConnectionState} for peer ${peerId}`);
            
            if (pc.iceConnectionState === 'disconnected' || 
                pc.iceConnectionState === 'failed' || 
                pc.iceConnectionState === 'closed') {
                console.debug(`Peer ${peerId} disconnected`);
                this.removePeer(peerId);
                
                // Trigger disconnect callbacks
                this.onDisconnectCallbacks.forEach(callback => callback(peerId));
            }
        };
        
        // Handle receiving remote tracks
        pc.ontrack = event => {
            console.debug(`Received remote track from ${peerId}`, event.track.kind);
            
            // Trigger all track callbacks
            this.onTrackCallbacks.forEach(callback => 
                callback(peerId, event.streams[0]));
        };
        
        // Add any pending ICE candidates
        if (this.pendingCandidates[peerId]) {
            this.pendingCandidates[peerId].forEach(candidate => {
                pc.addIceCandidate(new RTCIceCandidate(candidate));
                console.debug(`Added pending ICE candidate for ${peerId}`);
            });
            delete this.pendingCandidates[peerId];
        }
        
        return pc;
    }
    
    /**
     * Handle incoming WebRTC signaling message
     */
    async handleSignal(peerId, signal) {
        if (signal.type === 'offer') {
            await this.handleOffer(peerId, signal);
        } else if (signal.type === 'answer') {
            await this.handleAnswer(peerId, signal);
        } else if (signal.type === 'ice-candidate') {
            await this.handleIceCandidate(peerId, signal);
        } else if (signal.type === 'disconnect') {
            this.removePeer(peerId);
            this.onDisconnectCallbacks.forEach(callback => callback(peerId));
        }
    }
    
    /**
     * Handle incoming WebRTC offer
     */
    async handleOffer(peerId, signal) {
        console.debug(`Received offer from ${peerId}`);
        const pc = this.getPeerConnection(peerId);
        
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        this.sendSignal(peerId, {
            type: 'answer',
            sdp: pc.localDescription
        });
    }
    
    /**
     * Handle incoming WebRTC answer
     */
    async handleAnswer(peerId, signal) {
        console.debug(`Received answer from ${peerId}`);
        const pc = this.getPeerConnection(peerId);
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    }
    
    /**
     * Handle incoming ICE candidate
     */
    async handleIceCandidate(peerId, signal) {
        const candidate = signal.candidate;
        
        if (this.peerConnections[peerId]) {
            // Add candidate to existing connection
            const pc = this.peerConnections[peerId];
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.debug(`Added ICE candidate for ${peerId}`);
        } else {
            // Store candidate for future connection
            if (!this.pendingCandidates[peerId]) {
                this.pendingCandidates[peerId] = [];
            }
            this.pendingCandidates[peerId].push(candidate);
            console.debug(`Stored pending ICE candidate for ${peerId}`);
        }
    }
    
    /**
     * Create an offer and send it to a peer
     */
    async createOffer(peerId) {
        console.debug(`Creating offer for ${peerId}`);
        const pc = this.getPeerConnection(peerId);
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        this.sendSignal(peerId, {
            type: 'offer',
            sdp: pc.localDescription
        });
    }
    
    /**
     * Toggle screen sharing
     */
    async toggleScreenSharing() {
        if (this.isScreenSharing) {
            // Stop screen sharing
            if (this.screenStream) {
                this.screenStream.getTracks().forEach(track => track.stop());
                this.screenStream = null;
            }
            
            this.isScreenSharing = false;
            
            // Update all peer connections to use camera stream again
            for (const peerId in this.peerConnections) {
                this.updatePeerTracks(peerId);
            }
            
            return { active: false };
        } else {
            // Start screen sharing
            try {
                this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                });
                
                this.isScreenSharing = true;
                
                // Update all peer connections to use screen stream
                for (const peerId in this.peerConnections) {
                    this.updatePeerTracks(peerId);
                }
                
                // Setup a handler to detect when user stops sharing
                this.screenStream.getVideoTracks()[0].onended = () => {
                    this.toggleScreenSharing();
                };
                
                return { active: true, stream: this.screenStream };
            } catch (error) {
                console.error('Error getting screen:', error);
                return { active: false, error };
            }
        }
    }
    
    /**
     * Remove a peer connection
     */
    removePeer(peerId) {
        if (this.peerConnections[peerId]) {
            this.peerConnections[peerId].close();
            delete this.peerConnections[peerId];
            console.debug(`Removed peer connection for ${peerId}`);
        }
    }
    
    /**
     * Send a signal to a specific peer
     */
    async sendSignal(targetId, signal) {
        try {
            const response = await fetch('/api/signal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomId: this.roomId,
                    userId: this.userId,
                    targetId: targetId,
                    signal: signal
                })
            });
            
            const data = await response.json();
            if (!data.success) {
                console.error('Error sending signal:', data.error);
            }
        } catch (error) {
            console.error('Error sending signal:', error);
        }
    }
    
    /**
     * Close all peer connections
     */
    closeAllConnections() {
        for (const peerId in this.peerConnections) {
            this.peerConnections[peerId].close();
        }
        this.peerConnections = {};
        
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
        }
    }
}