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
  public initialize(isInitiator: boolean): void {
    if (isInitiator) {
      // Create data channel as the initiator
      this.dataChannel = this.webrtcManager.createDataChannel('chat');
      this.setupDataChannel();
    } else {
      // Set up callback to receive the data channel
      this.webrtcManager.setOnDataChannel((channel) => {
        this.dataChannel = channel;
        this.setupDataChannel();
      });
    }
  }

  /**
   * Set up data channel event handlers
   */
  private setupDataChannel(): void {
    if (!this.dataChannel) return;
    
    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const message: ChatMessage = {
          id: data.id,
          sender: data.sender,
          content: data.content,
          timestamp: data.timestamp,
          isLocal: false
        };
        
        this.messages.push(message);
        
        if (this.onMessageCallback) {
          this.onMessageCallback(message);
        }
      } catch (error) {
        console.error('Error parsing chat message:', error);
      }
    };
    
    this.dataChannel.onopen = () => {
      console.log('Chat data channel opened');
    };
    
    this.dataChannel.onclose = () => {
      console.log('Chat data channel closed');
    };
    
    this.dataChannel.onerror = (error) => {
      console.error('Chat data channel error:', error);
    };
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
      isLocal: true
    };
    
    try {
      this.dataChannel.send(JSON.stringify({
        id: messageId,
        sender: this.userId,
        content,
        timestamp
      }));
      
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
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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
    return this.dataChannel !== null && this.dataChannel.readyState === 'open';
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