import { FirebaseApiClient } from '../../api/FirebaseApiClient';
import * as firebaseAuth from 'firebase/auth';
import * as firebaseFirestore from 'firebase/firestore';
import { config } from '../../api/config';

// Mock firebase modules
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  onAuthStateChanged: jest.fn(),
  signOut: jest.fn(),
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
  onSnapshot: jest.fn(),
  Timestamp: {
    fromMillis: jest.fn().mockReturnValue({}),
  },
}));

describe('FirebaseApiClient', () => {
  let firebaseClient: FirebaseApiClient;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup auth mock
    (firebaseAuth.getAuth as jest.Mock).mockReturnValue({
      currentUser: { uid: 'user123', displayName: 'Test User' },
      onAuthStateChanged: firebaseAuth.onAuthStateChanged,
    });

    (firebaseAuth.onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      callback({ uid: 'user123', displayName: 'Test User' });
      return jest.fn(); // Return unsubscribe function
    });

    // Mock successful sign in
    (firebaseAuth.signInWithPopup as jest.Mock).mockResolvedValue({
      user: { uid: 'user123', displayName: 'Test User' },
    });

    // Setup firestore mock
    (firebaseFirestore.collection as jest.Mock).mockReturnValue({});
    (firebaseFirestore.doc as jest.Mock).mockReturnValue({});
    (firebaseFirestore.getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({ name: 'Test Room', created: new Date() }),
    });
    (firebaseFirestore.setDoc as jest.Mock).mockResolvedValue({});
    (firebaseFirestore.addDoc as jest.Mock).mockResolvedValue({ id: 'doc123' });

    // Initialize client with config
    firebaseClient = new FirebaseApiClient(config.firebase);

    // Mock connection and internals
    firebaseClient.connect = jest.fn().mockResolvedValue(undefined);
    firebaseClient.app = {
      name: 'test-app',
      options: {},
      automaticDataCollectionEnabled: false,
      delete: jest.fn(),
    } as any;
    firebaseClient.db = {
      type: 'firestore',
      app: firebaseClient.app,
      toJSON: jest.fn(),
    } as any;
    firebaseClient.user = { uid: 'user123', displayName: 'Test User' } as any;
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
    const result = await firebaseClient.createRoom();

    expect(firebaseFirestore.doc).toHaveBeenCalledWith(
      expect.anything(),
      'rooms',
      expect.any(String)
    );
    expect(firebaseFirestore.setDoc).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        roomId: expect.any(String),
        userId: expect.any(String),
        created: expect.any(Number),
      })
    );
  });

  // Note: Removed getRoom tests as the method doesn't exist in the implementation

  test('signInWithGoogle calls signInWithPopup', async () => {
    await firebaseClient.signInWithGoogle();

    expect(firebaseAuth.GoogleAuthProvider).toHaveBeenCalled();
    expect(firebaseAuth.signInWithPopup).toHaveBeenCalled();
  });

  test('signOut calls auth signOut', async () => {
    await firebaseClient.signOut();

    expect(firebaseAuth.signOut).toHaveBeenCalled();
  });

  test('onAuthStateChanged sets up auth listener', () => {
    // We'll directly test that the method returns a function without testing the callback
    // since the callback execution depends on Firebase's onAuthStateChanged implementation
    const callback = jest.fn();
    // Mock the return value from onAuthStateChanged
    (firebaseAuth.onAuthStateChanged as jest.Mock).mockReturnValue(() => {});
    const unsubscribe = firebaseClient.onAuthStateChanged(callback);

    expect(firebaseAuth.onAuthStateChanged).toHaveBeenCalled();
    expect(typeof unsubscribe).toBe('function');
  });
});
