import { FirebaseApiClient } from '../../api/FirebaseApiClient';
import * as firebaseAuth from 'firebase/auth';
import * as firebaseFirestore from 'firebase/firestore';

// Mock firebase modules
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn()
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn()
}));

describe('FirebaseApiClient', () => {
  let firebaseClient: FirebaseApiClient;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup auth mock
    (firebaseAuth.getAuth as jest.Mock).mockReturnValue({
      currentUser: { uid: 'user123', displayName: 'Test User' },
      onAuthStateChanged: firebaseAuth.onAuthStateChanged
    });
    
    (firebaseAuth.onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      callback({ uid: 'user123', displayName: 'Test User' });
      return jest.fn(); // Return unsubscribe function
    });
    
    // Mock successful sign in
    (firebaseAuth.signInWithPopup as jest.Mock).mockResolvedValue({
      user: { uid: 'user123', displayName: 'Test User' }
    });
    
    // Setup firestore mock
    (firebaseFirestore.collection as jest.Mock).mockReturnValue({});
    (firebaseFirestore.doc as jest.Mock).mockReturnValue({});
    (firebaseFirestore.getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({ name: 'Test Room', created: new Date() })
    });
    (firebaseFirestore.setDoc as jest.Mock).mockResolvedValue({});
    (firebaseFirestore.addDoc as jest.Mock).mockResolvedValue({ id: 'doc123' });
    
    // Initialize client
    firebaseClient = new FirebaseApiClient();
  });
  
  test('initializes correctly', () => {
    expect(firebaseClient).toBeDefined();
    expect(firebaseClient.getProviderName()).toBe('Firebase');
  });
  
  test('getCurrentUser returns the current user', () => {
    const user = firebaseClient.getCurrentUser();
    expect(user).toEqual({ uid: 'user123', displayName: 'Test User' });
  });
  
  test('createRoom creates a new room', async () => {
    const roomData = { name: 'New Room' };
    const result = await firebaseClient.createRoom(roomData);
    
    expect(firebaseFirestore.collection).toHaveBeenCalledWith(expect.anything(), 'rooms');
    expect(firebaseFirestore.addDoc).toHaveBeenCalledWith(
      expect.anything(), 
      expect.objectContaining({ 
        name: 'New Room',
        createdBy: 'user123'
      })
    );
    expect(result).toEqual({ id: 'doc123' });
  });
  
  test('getRoom retrieves room data', async () => {
    const result = await firebaseClient.getRoom('room123');
    
    expect(firebaseFirestore.doc).toHaveBeenCalledWith(expect.anything(), 'rooms', 'room123');
    expect(firebaseFirestore.getDoc).toHaveBeenCalled();
    expect(result).toEqual({ id: 'room123', name: 'Test Room', created: expect.any(Date) });
  });
  
  test('throws error when room not found', async () => {
    (firebaseFirestore.getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => false
    });
    
    await expect(firebaseClient.getRoom('nonexistent')).rejects.toThrow('Room not found');
  });
  
  test('signIn calls signInWithPopup', async () => {
    await firebaseClient.signIn();
    
    expect(firebaseAuth.GoogleAuthProvider).toHaveBeenCalled();
    expect(firebaseAuth.signInWithPopup).toHaveBeenCalled();
  });
  
  test('signOut calls auth signOut', async () => {
    await firebaseClient.signOut();
    
    expect(firebaseAuth.signOut).toHaveBeenCalled();
  });
  
  test('onAuthStateChanged sets up auth listener', () => {
    const callback = jest.fn();
    const unsubscribe = firebaseClient.onAuthStateChanged(callback);
    
    expect(firebaseAuth.onAuthStateChanged).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith({ uid: 'user123', displayName: 'Test User' });
    expect(unsubscribe).toBeInstanceOf(Function);
  });
});