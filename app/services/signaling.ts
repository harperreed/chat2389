/**
 * Signaling Service for WebRTC
 * Adapts signaling to work with Expo
 */

import { ApiInterface } from '../api/ApiInterface';

export interface SignalingMessage {
  type: string;
  sender: string;
  receiver?: string;
  roomId: string;
  data: any;
}

export class SignalingService {
  private apiClient: ApiInterface;
  private roomId: string | null = null;
  private userId: string | null = null;
  private messageHandlers: Map<string, (message: SignalingMessage) => void> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling = false;
  private lastMessageTime = 0;

  constructor(apiClient: ApiInterface) {
    this.apiClient = apiClient;
  }

  /**
   * Join a room
   */
  public async joinRoom(roomId: string): Promise<string> {
    try {
      console.log('[Signaling] Joining room via API:', roomId);
      
      // Join the room via API
      const result = await this.apiClient.joinRoom(roomId);
      this.roomId = roomId;
      this.userId = result.userId;
      
      console.log('[Signaling] Room joined successfully, userId:', this.userId);
      
      // Start polling for messages
      console.log('[Signaling] Starting message polling');
      this.startPolling();
      
      return this.userId;
    } catch (error) {
      console.error('[Signaling] Error joining room:', error);
      
      // Provide more specific error information
      if (error.message) {
        throw new Error(`Signaling error: ${error.message}`);
      } else {
        throw new Error('Failed to join room via signaling service.');
      }
    }
  }

  /**
   * Create a new room
   */
  public async createRoom(): Promise<{ roomId: string; userId: string }> {
    try {
      // Create room via API
      const result = await this.apiClient.createRoom();
      this.roomId = result.roomId;
      this.userId = result.userId;
      
      // Start polling for messages
      this.startPolling();
      
      return result;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  /**
   * Send a signaling message
   */
  public async sendMessage(type: string, data: any, receiver?: string): Promise<void> {
    if (!this.roomId || !this.userId) {
      throw new Error('Not connected to a room');
    }
    
    const message: SignalingMessage = {
      type,
      sender: this.userId,
      roomId: this.roomId,
      data
    };
    
    if (receiver) {
      message.receiver = receiver;
    }
    
    try {
      await this.apiClient.sendSignal(this.roomId, message);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Register a handler for a specific message type
   */
  public on(type: string, handler: (message: SignalingMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  /**
   * Remove a handler for a specific message type
   */
  public off(type: string): void {
    this.messageHandlers.delete(type);
  }

  /**
   * Start polling for new messages
   */
  private startPolling(): void {
    if (this.isPolling) return;
    
    this.isPolling = true;
    this.lastMessageTime = Date.now();
    
    // Poll every 1 second
    this.pollingInterval = setInterval(async () => {
      await this.pollMessages();
    }, 1000);
  }

  /**
   * Stop polling for messages
   */
  private stopPolling(): void {
    if (!this.isPolling) return;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.isPolling = false;
  }

  /**
   * Poll for new messages
   */
  private async pollMessages(): Promise<void> {
    if (!this.roomId || !this.userId) return;
    
    try {
      const messages = await this.apiClient.getSignals(this.roomId, this.lastMessageTime);
      
      if (messages.length > 0) {
        // Update last message time
        this.lastMessageTime = Math.max(...messages.map(m => m.timestamp || 0));
        
        // Process messages
        messages.forEach(message => {
          // Skip messages sent by this user
          if (message.sender === this.userId) return;
          
          // Skip messages not intended for this user
          if (message.receiver && message.receiver !== this.userId) return;
          
          // Handle the message
          const handler = this.messageHandlers.get(message.type);
          if (handler) {
            handler(message);
          }
        });
      }
    } catch (error) {
      console.error('Error polling messages:', error);
    }
  }

  /**
   * Leave the current room
   */
  public async leaveRoom(): Promise<void> {
    if (!this.roomId || !this.userId) return;
    
    try {
      // Stop polling for messages
      this.stopPolling();
      
      // Notify other users that we're leaving
      await this.sendMessage('user-left', { userId: this.userId });
      
      // Leave the room via API
      await this.apiClient.leaveRoom(this.roomId, this.userId);
      
      this.roomId = null;
      this.userId = null;
      this.messageHandlers.clear();
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }

  /**
   * Get room ID
   */
  public getRoomId(): string | null {
    return this.roomId;
  }

  /**
   * Get user ID
   */
  public getUserId(): string | null {
    return this.userId;
  }
}