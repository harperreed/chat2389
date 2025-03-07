/**
 * Signaling manager for handling communication with the server
 */
export default class SignalingManager {
    constructor(roomId) {
        this.roomId = roomId;
        this.userId = null;
        this.pollingInterval = null;
        this.onSignalCallbacks = [];
        this.onRoomStatusCallbacks = [];
    }
    
    /**
     * Join the room and get a user ID
     */
    async joinRoom() {
        try {
            const response = await fetch(`/api/join-room/${this.roomId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.userId = data.userId;
                
                // Start polling for signals
                this.startPolling();
                
                return {
                    success: true,
                    userId: data.userId,
                    participants: data.participants
                };
            } else {
                console.error('Failed to join room:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Error joining room:', error);
            return {
                success: false,
                error: 'Network error'
            };
        }
    }
    
    /**
     * Leave the room
     */
    async leaveRoom() {
        // Stop polling for signals
        this.stopPolling();
        
        try {
            const response = await fetch('/api/leave-room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomId: this.roomId,
                    userId: this.userId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                return { success: true };
            } else {
                console.error('Failed to leave room:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Error leaving room:', error);
            return {
                success: false,
                error: 'Network error'
            };
        }
    }
    
    /**
     * Get room status from the server
     */
    async getRoomStatus() {
        try {
            const response = await fetch(`/api/room-status/${this.roomId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Trigger room status callbacks
                this.onRoomStatusCallbacks.forEach(callback => callback(data));
                
                return {
                    success: true,
                    roomId: data.roomId,
                    participants: data.participants,
                    users: data.users
                };
            } else {
                console.error('Failed to get room status:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Error getting room status:', error);
            return {
                success: false,
                error: 'Network error'
            };
        }
    }
    
    /**
     * Start polling for signals
     */
    startPolling() {
        if (this.pollingInterval) return;
        
        this.pollingInterval = setInterval(() => {
            this.pollSignals();
        }, 1000);
    }
    
    /**
     * Stop polling for signals
     */
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }
    
    /**
     * Poll for signals from the server
     */
    async pollSignals() {
        try {
            const response = await fetch('/api/get-signals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    roomId: this.roomId,
                    userId: this.userId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Process incoming signals
                const signals = data.signals || [];
                
                signals.forEach(signal => {
                    this.onSignalCallbacks.forEach(callback => 
                        callback(signal.from, signal.signal));
                });
                
                return { success: true, signals };
            } else {
                console.error('Failed to get signals:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Error polling signals:', error);
            return {
                success: false,
                error: 'Network error'
            };
        }
    }
    
    /**
     * Send a signal through the server
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
            
            if (data.success) {
                return { success: true };
            } else {
                console.error('Failed to send signal:', data.error);
                return {
                    success: false,
                    error: data.error
                };
            }
        } catch (error) {
            console.error('Error sending signal:', error);
            return {
                success: false,
                error: 'Network error'
            };
        }
    }
    
    /**
     * Register callback function to be called when a signal is received
     */
    onSignal(callback) {
        this.onSignalCallbacks.push(callback);
    }
    
    /**
     * Register callback function to be called when room status changes
     */
    onRoomStatus(callback) {
        this.onRoomStatusCallbacks.push(callback);
    }
}