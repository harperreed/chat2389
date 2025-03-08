/**
 * Chat Manager for WebRTC
 * Handles data channel messaging
 */

import { WebRTCManager } from './webrtc';

export interface ChatMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: number;
  isLocal: boolean;
}

export class ChatManager {
  private dataChannel: RTCDataChannel | null = null;
  private messages: ChatMessage[] = [];
  private userId: string;
  private onMessageCallback: ((message: ChatMessage) => void) | null = null;
  private webrtcManager: WebRTCManager;

  constructor(userId: string, webrtcManager: WebRTCManager) {
    this.userId = userId;
    this.webrtcManager = webrtcManager;
  }

  /**
   * Initialize chat with a data channel
   */
  public async initialize(isInitiator: boolean): Promise<boolean> {
    console.log('[Chat] Initializing chat, isInitiator:', isInitiator);
    
    if (isInitiator) {
      // Create data channel as the initiator
      console.log('[Chat] Creating data channel as initiator');
      this.dataChannel = this.webrtcManager.createDataChannel('chat');
      
      if (!this.dataChannel) {
        console.error('[Chat] Failed to create data channel');
        return false;
      }
      
      this.setupDataChannel();
      
      // Wait for the channel to be ready
      const ready = await this.waitForChannelReady(15000);
      console.log('[Chat] Data channel ready state after initialization:', ready);
      return ready;
    } else {
      // Set up callback to receive the data channel
      console.log('[Chat] Setting up callback to receive data channel');
      this.webrtcManager.setOnDataChannel((channel) => {
        console.log('[Chat] Received data channel in callback');
        this.dataChannel = channel;
        this.setupDataChannel();
      });
      
      // Return true for non-initiators as they'll receive the channel later
      return true;
    }
  }

  /**
   * Set up data channel event handlers
   */
  private setupDataChannel(): void {
    if (!this.dataChannel) {
      console.error('[Chat] Cannot setup null data channel');
      return;
    }

    console.log('[Chat] Setting up data channel handlers for channel:', this.dataChannel.label);

    this.dataChannel.onmessage = (event) => {
      try {
        console.log('[Chat] Received message:', event.data.substring(0, 50) + (event.data.length > 50 ? '...' : ''));
        const data = JSON.parse(event.data);
        const message: ChatMessage = {
          id: data.id,
          sender: data.sender,
          content: data.content,
          timestamp: data.timestamp,
          isLocal: false,
        };

        this.messages.push(message);

        if (this.onMessageCallback) {
          this.onMessageCallback(message);
        }
      } catch (error) {
        console.error('[Chat] Error parsing chat message:', error);
      }
    };

    this.dataChannel.onopen = () => {
      console.log('[Chat] Data channel opened. Channel state:', this.dataChannel?.readyState);
    };

    this.dataChannel.onclose = () => {
      console.log('[Chat] Data channel closed. Channel state:', this.dataChannel?.readyState);
    };

    this.dataChannel.onerror = (error) => {
      console.error('[Chat] Data channel error:', error);
    };
    
    // Log the current state
    console.log('[Chat] Data channel initial state:', this.dataChannel.readyState);
  }

  /**
   * Send a chat message
   */
  public sendMessage(content: string): ChatMessage | null {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.error('Data channel not open');
      return null;
    }

    const messageId = this.generateId();
    const timestamp = Date.now();

    const message: ChatMessage = {
      id: messageId,
      sender: this.userId,
      content,
      timestamp,
      isLocal: true,
    };

    try {
      this.dataChannel.send(
        JSON.stringify({
          id: messageId,
          sender: this.userId,
          content,
          timestamp,
        })
      );

      this.messages.push(message);

      if (this.onMessageCallback) {
        this.onMessageCallback(message);
      }

      return message;
    } catch (error) {
      console.error('Error sending chat message:', error);
      return null;
    }
  }

  /**
   * Generate a unique ID for messages
   */
  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Set message callback
   */
  public onMessage(callback: (message: ChatMessage) => void): void {
    this.onMessageCallback = callback;
  }

  /**
   * Get all messages
   */
  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * Check if data channel is open
   */
  public isReady(): boolean {
    const isChannelOpen = this.dataChannel !== null && this.dataChannel.readyState === 'open';
    console.log('[Chat] Data channel ready state:', this.dataChannel?.readyState || 'null');
    return isChannelOpen;
  }
  
  /**
   * Wait for data channel to open (with timeout)
   */
  public waitForChannelReady(timeoutMs: number = 10000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isReady()) {
        console.log('[Chat] Data channel already open');
        resolve(true);
        return;
      }
      
      console.log('[Chat] Waiting for data channel to open...');
      
      // Set a timeout to avoid waiting indefinitely
      const timeout = setTimeout(() => {
        console.log('[Chat] Timed out waiting for data channel to open');
        resolve(false);
      }, timeoutMs);
      
      // Check if we have a data channel to monitor
      if (!this.dataChannel) {
        console.log('[Chat] No data channel to monitor');
        clearTimeout(timeout);
        resolve(false);
        return;
      }
      
      // Create a one-time event handler for the open event
      const openHandler = () => {
        console.log('[Chat] Data channel opened while waiting');
        clearTimeout(timeout);
        this.dataChannel?.removeEventListener('open', openHandler);
        resolve(true);
      };
      
      // Add the event listener
      this.dataChannel.addEventListener('open', openHandler);
    });
  }

  /**
   * Close the data channel
   */
  public close(): void {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
  }
}
