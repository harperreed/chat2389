import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import ApiInterface from './ApiInterface.js';
import { BACKENDS } from './config.js';

/**
 * Firebase Firestore API client implementing the ApiInterface
 * for communicating with a Firebase backend.
 * 
 * This client handles communication with Firebase Firestore including
 * real-time listeners for signaling.
 */
export default class FirebaseApiClient extends ApiInterface {
  /**
   * Creates a new Firebase Firestore API client
   * @param {Object} firebaseConfig - Firebase configuration object with apiKey, authDomain, etc.
   * @param {Object} options - Additional options
   * @param {number} [options.defaultTimeout=30000] - Default timeout in milliseconds
   * @param {number} [options.maxRetries=3] - Maximum number of retries for failed requests
   * @param {boolean} [options.debug=false] - Enable debug logging
   * @param {boolean} [options.enableHealthCheck=false] - Enable automatic health checking
   */
  constructor(firebaseConfig, options = {}) {
    super({
      defaultTimeout: options.defaultTimeout || 30000,
      maxRetries: options.maxRetries || 3
    });
    
    if (!firebaseConfig || !firebaseConfig.apiKey) {
      throw new Error('Firebase requires a valid configuration with apiKey');
    }
    
    this.firebaseConfig = firebaseConfig;
    this.debug = options.debug || false;
    this._backendType = BACKENDS.FIREBASE;
    this._isConnected = true; // Assume connected initially
    
    // Initialize Firebase
    this.app = initializeApp(firebaseConfig);
    this.db = getFirestore(this.app);
    
    // Collections
    this.roomsCollection = 'rooms';
    this.participantsCollection = 'participants';
    this.signalsCollection = 'signals';
    
    // Store active listeners
    this._listeners = new Map();
    
    // If health check is enabled, start it
    if (options.enableHealthCheck) {
      this._startHealthCheck(options.healthCheckInterval || 30000);
    }
    
    this._log('FirebaseApiClient initialized');
  }
  
  /**
   * Internal logging method that respects debug setting
   * @param {...any} args - Arguments to log
   * @private
   */
  _log(...args) {
    if (this.debug) {
      console.debug('[FirebaseApiClient]', ...args);
    }
  }
  
  /**
   * Starts a health check interval to verify API connectivity
   * @param {number} interval - Interval in milliseconds
   * @private
   */
  _startHealthCheck(interval) {
    this._healthCheckInterval = setInterval(async () => {
      try {
        // Simple health check - try to read from the rooms collection
        const testQuery = query(collection(this.db, this.roomsCollection), limit(1));
        await getDocs(testQuery);
        
        const wasConnected = this._isConnected;
        this._isConnected = true;
        
        if (!wasConnected && this._isConnected) {
          this._log('API connection restored');
          this.onConnectionRestored?.();
        }
      } catch (error) {
        const wasConnected = this._isConnected;
        this._isConnected = false;
        
        if (wasConnected) {
          this._log('API connection lost:', error.message);
          this.onConnectionLost?.();
        }
      }
    }, interval);
  }
  
  /**
   * Stops the health check interval
   * @private
   */
  _stopHealthCheck() {
    if (this._healthCheckInterval) {
      clearInterval(this._healthCheckInterval);
      this._healthCheckInterval = null;
    }
  }

  /**
   * Create a new room
   * @param {Object} [options] - Options for creating the room
   * @returns {Promise<{success: boolean, roomId: string, error: string}>}
   */
  async createRoom(options = {}) {
    try {
      // Create a room document with metadata
      const roomData = {
        metadata: options.metadata || null,
        created: serverTimestamp(),
        active: true
      };
      
      // Add the room to Firestore
      const roomRef = await addDoc(collection(this.db, this.roomsCollection), roomData);
      
      return {
        success: true,
        roomId: roomRef.id
      };
    } catch (error) {
      this._log('Error creating room:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Join an existing room
   * @param {string} roomId - ID of the room to join
   * @param {Object} [options] - Options for joining the room
   * @returns {Promise<{success: boolean, roomId: string, userId: string, participants: number, error: string}>}
   */
  async joinRoom(roomId, options = {}) {
    try {
      this._validateRoomId(roomId);
      
      // Check if room exists
      const roomRef = doc(this.db, this.roomsCollection, roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        return { success: false, error: 'Room does not exist' };
      }
      
      const roomData = roomSnap.data();
      
      // Check if room is active
      if (!roomData.active) {
        return { success: false, error: 'Room is no longer active' };
      }
      
      // Generate a random user ID
      const userId = Math.random().toString(36).substring(2, 10);
      
      // Create a participant document
      const participantData = {
        room: roomId,
        userId,
        joined: serverTimestamp(),
        active: true,
        metadata: options.metadata || null
      };
      
      await addDoc(collection(this.db, this.participantsCollection), participantData);
      
      // Set up real-time listener for signals
      this._setupSignalListener(roomId, userId);
      
      // Get current participants count
      const participantsQuery = query(
        collection(this.db, this.participantsCollection),
        where('room', '==', roomId),
        where('active', '==', true)
      );
      const participantsSnap = await getDocs(participantsQuery);
      
      return {
        success: true,
        roomId,
        userId,
        participants: participantsSnap.size
      };
    } catch (error) {
      this._log('Error joining room:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Leave a room
   * @param {string} roomId - ID of the room to leave
   * @param {string} userId - ID of the user leaving
   * @returns {Promise<{success: boolean, error: string}>}
   */
  async leaveRoom(roomId, userId) {
    try {
      this._validateRoomId(roomId);
      this._validateUserId(userId);
      
      // Find the participant
      const participantsQuery = query(
        collection(this.db, this.participantsCollection),
        where('room', '==', roomId),
        where('userId', '==', userId),
        where('active', '==', true)
      );
      
      const participantsSnap = await getDocs(participantsQuery);
      
      if (participantsSnap.empty) {
        return { success: false, error: 'User not found in room' };
      }
      
      // Update the participant as inactive
      const participantDoc = participantsSnap.docs[0];
      await updateDoc(participantDoc.ref, {
        active: false,
        left: serverTimestamp()
      });
      
      // Remove signal listener
      this._removeSignalListener(roomId, userId);
      
      // Check if room is empty
      const activeParticipantsQuery = query(
        collection(this.db, this.participantsCollection),
        where('room', '==', roomId),
        where('active', '==', true)
      );
      
      const activeParticipantsSnap = await getDocs(activeParticipantsQuery);
      
      if (activeParticipantsSnap.empty) {
        // Mark room as inactive if empty
        const roomRef = doc(this.db, this.roomsCollection, roomId);
        await updateDoc(roomRef, {
          active: false,
          closed: serverTimestamp()
        });
      }
      
      return { success: true };
    } catch (error) {
      this._log('Error leaving room:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get the status of a room
   * @param {string} roomId - ID of the room
   * @returns {Promise<{success: boolean, roomId: string, participants: number, users: string[], error: string}>}
   */
  async getRoomStatus(roomId) {
    try {
      this._validateRoomId(roomId);
      
      // Get room data
      const roomRef = doc(this.db, this.roomsCollection, roomId);
      const roomSnap = await getDoc(roomRef);
      
      if (!roomSnap.exists()) {
        return { success: false, error: 'Room does not exist' };
      }
      
      const roomData = roomSnap.data();
      
      if (!roomData.active) {
        return { success: false, error: 'Room is no longer active' };
      }
      
      // Get active participants
      const participantsQuery = query(
        collection(this.db, this.participantsCollection),
        where('room', '==', roomId),
        where('active', '==', true)
      );
      
      const participantsSnap = await getDocs(participantsQuery);
      const users = participantsSnap.docs.map(doc => doc.data().userId);
      
      return {
        success: true,
        roomId,
        participants: users.length,
        users
      };
    } catch (error) {
      this._log('Error getting room status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a WebRTC signal to another user
   * @param {string} roomId - ID of the room
   * @param {string} userId - ID of the user sending the signal
   * @param {string} targetId - ID of the user to receive the signal
   * @param {object} signal - WebRTC signal data
   * @returns {Promise<{success: boolean, error: string}>}
   */
  async sendSignal(roomId, userId, targetId, signal) {
    try {
      this._validateRoomId(roomId);
      this._validateUserId(userId);
      this._validateUserId(targetId);
      this._validateSignal(signal);
      
      // Create a signal document
      const signalData = {
        room: roomId,
        from: userId,
        to: targetId,
        signal,
        created: serverTimestamp(),
        processed: false
      };
      
      await addDoc(collection(this.db, this.signalsCollection), signalData);
      
      return { success: true };
    } catch (error) {
      this._log('Error sending signal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending signals for a user
   * @param {string} roomId - ID of the room
   * @param {string} userId - ID of the user
   * @param {Object} [options] - Options for getting signals
   * @param {string} [options.since] - Get signals since this timestamp
   * @returns {Promise<{success: boolean, signals: Array<{from: string, signal: object}>, error: string}>}
   */
  async getSignals(roomId, userId, options = {}) {
    try {
      this._validateRoomId(roomId);
      this._validateUserId(userId);
      
      // Build query for unprocessed signals
      let signalsQuery = query(
        collection(this.db, this.signalsCollection),
        where('room', '==', roomId),
        where('to', '==', userId),
        where('processed', '==', false),
        orderBy('created')
      );
      
      // Get pending signals
      const signalsSnap = await getDocs(signalsQuery);
      
      // Format signals and mark as processed
      const signals = [];
      const updatePromises = [];
      
      signalsSnap.forEach(doc => {
        const data = doc.data();
        signals.push({
          from: data.from,
          signal: data.signal
        });
        
        // Mark as processed
        updatePromises.push(updateDoc(doc.ref, {
          processed: true,
          retrievedAt: serverTimestamp()
        }));
      });
      
      // Update all signals as processed
      await Promise.all(updatePromises);
      
      return {
        success: true,
        signals
      };
    } catch (error) {
      this._log('Error getting signals:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set up a real-time listener for signals
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @private
   */
  _setupSignalListener(roomId, userId) {
    const key = `${roomId}:${userId}`;
    
    // Remove existing listener if any
    this._removeSignalListener(roomId, userId);
    
    try {
      // Create query for signals to this user
      const signalsQuery = query(
        collection(this.db, this.signalsCollection),
        where('room', '==', roomId),
        where('to', '==', userId),
        where('processed', '==', false)
      );
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(signalsQuery, snapshot => {
        snapshot.docChanges().forEach(async change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            
            // Handle the signal
            this._log(`Received signal for ${userId} from ${data.from}`);
            
            // Call the onSignal handler
            this.onSignal?.(data.from, data.signal);
            
            // Mark as processed
            await updateDoc(change.doc.ref, {
              processed: true,
              retrievedAt: serverTimestamp()
            });
          }
        });
      }, error => {
        this._log('Error in signal listener:', error);
      });
      
      // Store the unsubscribe function
      this._listeners.set(key, unsubscribe);
      this._log(`Set up signal listener for room ${roomId}, user ${userId}`);
    } catch (error) {
      this._log('Error setting up signal listener:', error);
    }
  }

  /**
   * Remove a signal listener
   * @param {string} roomId - Room ID
   * @param {string} userId - User ID
   * @private
   */
  _removeSignalListener(roomId, userId) {
    const key = `${roomId}:${userId}`;
    
    if (this._listeners.has(key)) {
      const unsubscribe = this._listeners.get(key);
      unsubscribe();
      this._listeners.delete(key);
      this._log(`Removed signal listener for room ${roomId}, user ${userId}`);
    }
  }

  /**
   * Cleans up resources used by the client
   */
  destroy() {
    this._stopHealthCheck();
    
    // Remove all listeners
    for (const unsubscribe of this._listeners.values()) {
      unsubscribe();
    }
    this._listeners.clear();
  }
}