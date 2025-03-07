/**
 * Unit tests for FirebaseApiClient
 * 
 * Note: These tests mock the Firebase imports to avoid actual network requests
 * and use Jest's mocking capabilities to simulate the Firebase behavior.
 */

import FirebaseApiClient from '../../../src/js/api/FirebaseApiClient';
import { BACKENDS } from '../../../src/js/api/config';
import ApiInterface from '../../../src/js/api/ApiInterface';

// Mock the Firebase imports
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn().mockReturnValue({ name: 'mocked-app' })
}));

// Create mock data stores for simulating Firestore
const mockRooms = new Map();
const mockParticipants = new Map();
const mockSignals = new Map();
let mockDocIdCounter = 1;

// Mock firestore functions
jest.mock('firebase/firestore', () => {
  // Helper to generate a unique ID for documents
  const generateId = () => `doc-${mockDocIdCounter++}`;
  
  // Create a mock document reference
  const createDocRef = (collectionPath, id) => ({
    id,
    path: `${collectionPath}/${id}`
  });
  
  // Create mock query result
  const createQuerySnapshot = (items) => ({
    docs: items.map(item => ({
      id: item.id,
      data: () => ({ ...item }),
      ref: createDocRef('', item.id)
    })),
    empty: items.length === 0,
    size: items.length,
    forEach: (callback) => items.forEach((item, idx) => {
      callback({
        id: item.id,
        data: () => ({ ...item }),
        ref: createDocRef('', item.id)
      });
    })
  });
  
  // Create mock document changes for onSnapshot
  const createDocChanges = (items, type = 'added') => {
    return items.map(item => ({
      type,
      doc: {
        id: item.id,
        data: () => ({ ...item }),
        ref: createDocRef('', item.id)
      }
    }));
  };
  
  // Mock all the Firestore functions
  return {
    getFirestore: jest.fn().mockReturnValue({}),
    
    collection: jest.fn().mockImplementation((db, path) => ({
      path
    })),
    
    doc: jest.fn().mockImplementation((db, path, id) => {
      return createDocRef(path, id);
    }),
    
    addDoc: jest.fn().mockImplementation(async (collectionRef, data) => {
      const id = generateId();
      const docData = { id, ...data };
      
      // Store in the appropriate mock collection
      if (collectionRef.path.includes('rooms')) {
        mockRooms.set(id, docData);
      } else if (collectionRef.path.includes('participants')) {
        mockParticipants.set(id, docData);
      } else if (collectionRef.path.includes('signals')) {
        mockSignals.set(id, docData);
      }
      
      return createDocRef(collectionRef.path, id);
    }),
    
    getDoc: jest.fn().mockImplementation(async (docRef) => {
      // Determine which collection to use based on the path
      let docData;
      if (docRef.path.includes('rooms')) {
        docData = mockRooms.get(docRef.id);
      } else if (docRef.path.includes('participants')) {
        docData = mockParticipants.get(docRef.id);
      } else if (docRef.path.includes('signals')) {
        docData = mockSignals.get(docRef.id);
      }
      
      return {
        exists: () => !!docData,
        data: () => docData,
        id: docRef.id
      };
    }),
    
    getDocs: jest.fn().mockImplementation(async (query) => {
      // Filter items based on the query conditions
      const collection = query._collection;
      const conditions = query._conditions || [];
      
      let items = [];
      
      // Determine which collection to use
      if (collection.includes('rooms')) {
        items = Array.from(mockRooms.values());
      } else if (collection.includes('participants')) {
        items = Array.from(mockParticipants.values());
      } else if (collection.includes('signals')) {
        items = Array.from(mockSignals.values());
      }
      
      // Apply filters if there are any
      if (conditions.length > 0) {
        items = items.filter(item => {
          return conditions.every(condition => {
            const [field, op, value] = condition;
            
            if (op === '==') {
              return item[field] === value;
            } else if (op === '!=') {
              return item[field] !== value;
            }
            return true;
          });
        });
      }
      
      return createQuerySnapshot(items);
    }),
    
    updateDoc: jest.fn().mockImplementation(async (docRef, updates) => {
      // Determine which collection to use based on the path
      if (docRef.path.includes('rooms')) {
        const existing = mockRooms.get(docRef.id);
        if (existing) {
          mockRooms.set(docRef.id, { ...existing, ...updates });
        }
      } else if (docRef.path.includes('participants')) {
        const existing = mockParticipants.get(docRef.id);
        if (existing) {
          mockParticipants.set(docRef.id, { ...existing, ...updates });
        }
      } else if (docRef.path.includes('signals')) {
        const existing = mockSignals.get(docRef.id);
        if (existing) {
          mockSignals.set(docRef.id, { ...existing, ...updates });
        }
      }
      
      return {};
    }),
    
    onSnapshot: jest.fn().mockImplementation((query, callback) => {
      // This normally sets up a subscription, but for tests we'll just return an unsubscribe function
      // We'll manually trigger the callback during tests if needed
      
      // Store the callback and query for later use in tests
      query._callback = callback;
      
      // Return an unsubscribe function
      return jest.fn();
    }),
    
    // Create mock query builders
    query: jest.fn().mockImplementation((collectionRef, ...queryConstraints) => {
      // Store the collection reference and conditions
      const q = {
        _collection: collectionRef.path,
        _conditions: []
      };
      
      // Apply the constraints
      queryConstraints.forEach(constraint => {
        if (constraint._type === 'where') {
          q._conditions.push([constraint._field, constraint._op, constraint._value]);
        }
      });
      
      return q;
    }),
    
    where: jest.fn().mockImplementation((field, op, value) => ({
      _type: 'where',
      _field: field,
      _op: op,
      _value: value
    })),
    
    orderBy: jest.fn().mockImplementation((field, direction) => ({
      _type: 'orderBy',
      _field: field,
      _direction: direction || 'asc'
    })),
    
    limit: jest.fn().mockImplementation((n) => ({
      _type: 'limit',
      _limit: n
    })),
    
    serverTimestamp: jest.fn().mockReturnValue(new Date().toISOString())
  };
});

describe('FirebaseApiClient', () => {
  let client;
  const firebaseConfig = {
    apiKey: 'test-api-key',
    authDomain: 'test-app.firebaseapp.com',
    projectId: 'test-app',
    storageBucket: 'test-app.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abc123def456'
  };
  
  beforeEach(() => {
    // Clear mock data before each test
    mockRooms.clear();
    mockParticipants.clear();
    mockSignals.clear();
    mockDocIdCounter = 1;
    
    // Create a new instance for each test
    client = new FirebaseApiClient(firebaseConfig, {
      defaultTimeout: 100, // Fast timeout for tests
      maxRetries: 1,
      debug: true
    });
    
    // Reset all mock implementations before each test
    jest.clearAllMocks();
  });
  
  it('should extend ApiInterface', () => {
    expect(client).toBeInstanceOf(ApiInterface);
  });
  
  it('should set backendType to "firebase"', () => {
    expect(client.getBackendType()).toBe(BACKENDS.FIREBASE);
  });
  
  it('should throw an error if no firebaseConfig is provided', () => {
    expect(() => new FirebaseApiClient()).toThrow('Firebase requires a valid configuration');
  });
  
  describe('createRoom', () => {
    it('should create a new room', async () => {
      const metadata = { name: 'Test Room' };
      const result = await client.createRoom({ metadata });
      
      // Check the result
      expect(result.success).toBe(true);
      expect(result.roomId).toBeDefined();
      
      // Check that a document was added to the rooms collection
      expect(mockRooms.size).toBe(1);
      const roomData = Array.from(mockRooms.values())[0];
      expect(roomData.metadata).toEqual(metadata);
      expect(roomData.active).toBe(true);
    });
  });
  
  describe('joinRoom', () => {
    it('should join an existing room', async () => {
      // Create a room first
      const createResult = await client.createRoom();
      const roomId = createResult.roomId;
      
      // Join the room
      const result = await client.joinRoom(roomId);
      
      // Check the result
      expect(result.success).toBe(true);
      expect(result.roomId).toBe(roomId);
      expect(result.userId).toBeDefined();
      expect(result.participants).toBe(1);
      
      // Check that a participant document was created
      expect(mockParticipants.size).toBe(1);
      const participantData = Array.from(mockParticipants.values())[0];
      expect(participantData.room).toBe(roomId);
      expect(participantData.userId).toBe(result.userId);
      expect(participantData.active).toBe(true);
    });
    
    it('should return an error for a non-existent room', async () => {
      // Patch the getDoc mock to simulate a room not found
      const getDocMock = require('firebase/firestore').getDoc;
      getDocMock.mockResolvedValueOnce({
        exists: () => false,
        data: () => null
      });
      
      const result = await client.joinRoom('non-existent-room');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room does not exist');
    });
  });
  
  describe('leaveRoom', () => {
    it('should leave a room successfully', async () => {
      // Set up a room with a participant
      const createResult = await client.createRoom();
      const roomId = createResult.roomId;
      const joinResult = await client.joinRoom(roomId);
      const userId = joinResult.userId;
      
      // Leave the room
      const result = await client.leaveRoom(roomId, userId);
      
      // Check the result
      expect(result.success).toBe(true);
      
      // Check that the participant is marked as inactive
      const participantData = Array.from(mockParticipants.values())[0];
      expect(participantData.active).toBe(false);
      expect(participantData.left).toBeDefined();
    });
  });
  
  describe('getRoomStatus', () => {
    it('should get the status of a room', async () => {
      // Create a room and add some participants
      const createResult = await client.createRoom();
      const roomId = createResult.roomId;
      await client.joinRoom(roomId);
      await client.joinRoom(roomId);
      
      // Get room status
      const result = await client.getRoomStatus(roomId);
      
      // Check the result
      expect(result.success).toBe(true);
      expect(result.roomId).toBe(roomId);
      expect(result.participants).toBe(2);
      expect(Array.isArray(result.users)).toBe(true);
      expect(result.users.length).toBe(2);
    });
  });
  
  describe('sendSignal and getSignals', () => {
    it('should send a signal and retrieve it', async () => {
      // Set up a room with two participants
      const createResult = await client.createRoom();
      const roomId = createResult.roomId;
      const join1 = await client.joinRoom(roomId);
      const userId1 = join1.userId;
      const join2 = await client.joinRoom(roomId);
      const userId2 = join2.userId;
      
      // Send a signal from user1 to user2
      const signal = { type: 'offer', sdp: 'test-sdp' };
      const sendResult = await client.sendSignal(roomId, userId1, userId2, signal);
      
      // Check the send result
      expect(sendResult.success).toBe(true);
      
      // Check that a signal was added to the signals collection
      expect(mockSignals.size).toBe(1);
      const signalData = Array.from(mockSignals.values())[0];
      expect(signalData.room).toBe(roomId);
      expect(signalData.from).toBe(userId1);
      expect(signalData.to).toBe(userId2);
      expect(signalData.signal).toEqual(signal);
      expect(signalData.processed).toBe(false);
      
      // Get signals for user2
      const getResult = await client.getSignals(roomId, userId2);
      
      // Check the get result
      expect(getResult.success).toBe(true);
      expect(getResult.signals.length).toBe(1);
      expect(getResult.signals[0].from).toBe(userId1);
      expect(getResult.signals[0].signal).toEqual(signal);
      
      // Check that the signal was marked as processed
      const updatedSignalData = Array.from(mockSignals.values())[0];
      expect(updatedSignalData.processed).toBe(true);
    });
  });
  
  describe('signal listeners', () => {
    it('should set up and remove signal listeners', () => {
      // Mock the onSnapshot function
      const onSnapshot = require('firebase/firestore').onSnapshot;
      
      // Set up signal listener
      client._setupSignalListener('test-room', 'test-user');
      
      // Check that onSnapshot was called correctly
      expect(onSnapshot).toHaveBeenCalled();
      
      // Check that the listener was stored
      expect(client._listeners.has('test-room:test-user')).toBe(true);
      
      // Remove the listener
      client._removeSignalListener('test-room', 'test-user');
      
      // Check that the unsubscribe function was called
      const unsubscribeFn = client._listeners.get('test-room:test-user');
      expect(unsubscribeFn).toHaveBeenCalled();
      
      // Check that the listener was removed
      expect(client._listeners.has('test-room:test-user')).toBe(false);
    });
    
    it('should handle incoming signals through the listener', () => {
      // Set up a mock signal handler on the client
      client.onSignal = jest.fn();
      
      // Set up a signal listener
      client._setupSignalListener('test-room', 'test-user');
      
      // Get the onSnapshot callback
      const onSnapshot = require('firebase/firestore').onSnapshot;
      const query = onSnapshot.mock.calls[0][0];
      const callback = onSnapshot.mock.calls[0][1];
      
      // Create a mock signal
      const signalData = {
        id: 'signal-1',
        room: 'test-room',
        from: 'other-user',
        to: 'test-user',
        signal: { type: 'offer', sdp: 'test' },
        processed: false
      };
      
      // Add signal to mock storage
      mockSignals.set(signalData.id, signalData);
      
      // Simulate a signal coming in through the snapshot
      callback({
        docChanges: () => [{
          type: 'added',
          doc: {
            id: signalData.id,
            data: () => signalData,
            ref: { id: signalData.id, path: 'signals/signal-1' }
          }
        }]
      });
      
      // Check that the signal handler was called
      expect(client.onSignal).toHaveBeenCalledWith(signalData.from, signalData.signal);
      
      // Check that the signal was marked as processed
      expect(require('firebase/firestore').updateDoc).toHaveBeenCalled();
    });
  });
  
  describe('destroy', () => {
    it('should clean up resources', () => {
      // Set up mock listeners
      const unsubscribe1 = jest.fn();
      const unsubscribe2 = jest.fn();
      client._listeners.set('test1', unsubscribe1);
      client._listeners.set('test2', unsubscribe2);
      
      // Call destroy
      client.destroy();
      
      // Check that all listeners were called and cleared
      expect(unsubscribe1).toHaveBeenCalled();
      expect(unsubscribe2).toHaveBeenCalled();
      expect(client._listeners.size).toBe(0);
    });
  });
});