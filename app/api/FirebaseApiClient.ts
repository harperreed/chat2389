/**
 * Firebase API Client for WebRTC signaling
 */

import {
  initializeApp,
  getApp,
  FirebaseApp,
  FirebaseOptions
} from 'firebase/app';
import {
  getDatabase,
  ref,
  set,
  push,
  onValue,
  get,
  query,
  orderByChild,
  startAt,
  Database
} from 'firebase/database';
import { ApiInterface, RoomResponse, JoinRoomResponse } from './ApiInterface';
import { SignalingMessage } from '../services/signaling';

export class FirebaseApiClient implements ApiInterface {
  private app: FirebaseApp | null = null;
  private db: Database | null = null;
  private config: FirebaseOptions;
  private listeners: any[] = [];
  
  constructor(config: FirebaseOptions) {
    this.config = config;
  }
  
  /**
   * Connect to Firebase
   */
  public async connect(): Promise<void> {
    try {
      // Initialize Firebase app if not already initialized
      try {
        this.app = getApp();
      } catch {
        this.app = initializeApp(this.config);
      }
      
      // Get database reference
      this.db = getDatabase(this.app);
    } catch (error) {
      console.error('Error connecting to Firebase:', error);
      throw error;
    }
  }
  
  /**
   * Disconnect from Firebase
   */
  public async disconnect(): Promise<void> {
    // Clean up any listeners
    this.listeners.forEach(listener => listener());
    this.listeners = [];
    
    // Firebase doesn't have an explicit disconnect method
    this.db = null;
  }
  
  /**
   * Create a new room
   */
  public async createRoom(): Promise<RoomResponse> {
    if (!this.db) throw new Error('Not connected to Firebase');
    
    try {
      // Generate room ID
      const roomId = this.generateRoomId();
      
      // Generate user ID
      const userId = this.generateUserId();
      
      // Create timestamp
      const created = Date.now();
      
      // Create room in Firebase
      const roomRef = ref(this.db, `rooms/${roomId}`);
      await set(roomRef, {
        created,
        createdBy: userId,
        active: true
      });
      
      // Add user to room
      const userRef = ref(this.db, `rooms/${roomId}/users/${userId}`);
      await set(userRef, {
        joined: created,
        active: true
      });
      
      return {
        roomId,
        userId,
        created
      };
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }
  
  /**
   * Join an existing room
   */
  public async joinRoom(roomId: string): Promise<JoinRoomResponse> {
    if (!this.db) throw new Error('Not connected to Firebase');
    
    try {
      // Check if room exists
      const roomRef = ref(this.db, `rooms/${roomId}`);
      const roomSnapshot = await get(roomRef);
      
      if (!roomSnapshot.exists()) {
        throw new Error(`Room ${roomId} does not exist`);
      }
      
      // Generate user ID
      const userId = this.generateUserId();
      
      // Create timestamp
      const joined = Date.now();
      
      // Add user to room
      const userRef = ref(this.db, `rooms/${roomId}/users/${userId}`);
      await set(userRef, {
        joined,
        active: true
      });
      
      return {
        userId,
        joined
      };
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }
  
  /**
   * Leave a room
   */
  public async leaveRoom(roomId: string, userId: string): Promise<void> {
    if (!this.db) throw new Error('Not connected to Firebase');
    
    try {
      // Mark user as inactive
      const userRef = ref(this.db, `rooms/${roomId}/users/${userId}`);
      await set(userRef, {
        active: false,
        left: Date.now()
      });
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  }
  
  /**
   * Send a signaling message
   */
  public async sendSignal(roomId: string, message: SignalingMessage): Promise<void> {
    if (!this.db) throw new Error('Not connected to Firebase');
    
    try {
      // Add timestamp to message
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now()
      };
      
      // Add message to room's signals
      const signalsRef = ref(this.db, `rooms/${roomId}/signals`);
      const newSignalRef = push(signalsRef);
      await set(newSignalRef, messageWithTimestamp);
    } catch (error) {
      console.error('Error sending signal:', error);
      throw error;
    }
  }
  
  /**
   * Get signaling messages
   */
  public async getSignals(roomId: string, since: number = 0): Promise<SignalingMessage[]> {
    if (!this.db) throw new Error('Not connected to Firebase');
    
    try {
      // Query messages since the given timestamp
      const signalsRef = ref(this.db, `rooms/${roomId}/signals`);
      const signalsQuery = query(
        signalsRef,
        orderByChild('timestamp'),
        startAt(since)
      );
      
      // Get signals
      const snapshot = await get(signalsQuery);
      const signals: SignalingMessage[] = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          signals.push(childSnapshot.val() as SignalingMessage);
        });
      }
      
      return signals;
    } catch (error) {
      console.error('Error getting signals:', error);
      throw error;
    }
  }
  
  /**
   * Get the name of the API provider
   */
  public getProviderName(): string {
    return 'Firebase';
  }
  
  /**
   * Generate a random room ID
   */
  private generateRoomId(): string {
    // Generate a 6-character alphanumeric ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  /**
   * Generate a random user ID
   */
  private generateUserId(): string {
    // Generate a UUID-like string
    return 'user_' + Math.random().toString(36).substring(2, 15);
  }
}