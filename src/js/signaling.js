import ApiProvider, { determineApiClientType } from './api/ApiProvider.js';

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
        
        // Get the API client
        const apiType = determineApiClientType();
        this.apiClient = ApiProvider.getClient(apiType);
        
        console.debug(`Using ${apiType} API client for signaling`);
    }
    
    /**
     * Join the room and get a user ID
     */
    async joinRoom() {
        try {
            const data = await this.apiClient.joinRoom(this.roomId);
            
            if (data.success) {
                this.userId = data.userId;
                
                // Start polling for signals
                this.startPolling();
                
                return {
                    success: true,
                    userId: data.userId,
                    participants: data.participants
                };
            }
            
            console.error('Failed to join room:', data.error);
            return {
                success: false,
                error: data.error
            };
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
            const data = await this.apiClient.leaveRoom(this.roomId, this.userId);
            
            if (data.success) {
                return { success: true };
            }
            
            console.error('Failed to leave room:', data.error);
            return {
                success: false,
                error: data.error
            };
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
            const data = await this.apiClient.getRoomStatus(this.roomId);
            
            if (data.success) {
                // Trigger room status callbacks
                for (const callback of this.onRoomStatusCallbacks) {
                    callback(data);
                }
                
                return {
                    success: true,
                    roomId: data.roomId,
                    participants: data.participants,
                    users: data.users
                };
            }
            
            console.error('Failed to get room status:', data.error);
            return {
                success: false,
                error: data.error
            };
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
            const data = await this.apiClient.getSignals(this.roomId, this.userId);
            
            if (data.success) {
                // Process incoming signals
                const signals = data.signals || [];
                
                for (const signal of signals) {
                    for (const callback of this.onSignalCallbacks) {
                        callback(signal.from, signal.signal);
                    }
                }
                
                return { success: true, signals };
            }
            
            console.error('Failed to get signals:', data.error);
            return {
                success: false,
                error: data.error
            };
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
            const data = await this.apiClient.sendSignal(
                this.roomId,
                this.userId,
                targetId,
                signal
            );
            
            if (data.success) {
                return { success: true };
            }
            
            console.error('Failed to send signal:', data.error);
            return {
                success: false,
                error: data.error
            };
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