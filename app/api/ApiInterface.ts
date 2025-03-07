/**
 * API Interface for WebRTC signaling and room management
 */

import { SignalingMessage } from '../services/signaling';

export interface RoomResponse {
  roomId: string;
  userId: string;
  created: number;
}

export interface JoinRoomResponse {
  userId: string;
  joined: number;
}

export interface ApiInterface {
  /**
   * Create a new room
   */
  createRoom(): Promise<RoomResponse>;

  /**
   * Join an existing room
   */
  joinRoom(roomId: string): Promise<JoinRoomResponse>;

  /**
   * Leave a room
   */
  leaveRoom(roomId: string, userId: string): Promise<void>;

  /**
   * Send a signaling message
   */
  sendSignal(roomId: string, message: SignalingMessage): Promise<void>;

  /**
   * Get signaling messages
   */
  getSignals(roomId: string, since?: number): Promise<SignalingMessage[]>;

  /**
   * Connect to the API
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the API
   */
  disconnect(): Promise<void>;

  /**
   * Get the name of the API provider
   */
  getProviderName(): string;
}