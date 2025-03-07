/**
 * Unit tests for PocketBaseApiClient
 * 
 * Note: These tests mock the PocketBase class to avoid actual network requests
 * and use Jest's mocking capabilities to simulate the client behavior.
 */

import PocketBaseApiClient from '../../../src/js/api/PocketBaseApiClient';
import { BACKENDS } from '../../../src/js/api/config';
import ApiInterface from '../../../src/js/api/ApiInterface';

// Mock the PocketBase import
jest.mock('pocketbase', () => {
  return jest.fn().mockImplementation(() => {
    return {
      collection: jest.fn().mockImplementation((collectionName) => {
        return {
          create: jest.fn().mockImplementation((data) => Promise.resolve({
            id: 'test-id-123',
            ...data
          })),
          getOne: jest.fn().mockImplementation((id) => {
            if (id === 'non-existent') {
              return Promise.reject(new Error('Record not found'));
            }
            return Promise.resolve({
              id,
              active: true,
              metadata: null,
              created: new Date().toISOString()
            });
          }),
          getList: jest.fn().mockImplementation((page, perPage, options) => {
            const filter = options?.filter || '';
            const items = [];
            
            // Simulate filtering for testing
            if (filter.includes('non-existent')) {
              return Promise.resolve({ items: [] });
            }
            
            // Add a few mock items
            if (collectionName === 'participants') {
              if (filter.includes('active = true')) {
                items.push({ userId: 'user-1', active: true });
                items.push({ userId: 'user-2', active: true });
              }
            } else if (collectionName === 'signals') {
              if (filter.includes('processed = false')) {
                items.push({ 
                  id: 'signal-1',
                  from: 'user-1', 
                  signal: JSON.stringify({ type: 'offer', sdp: 'test' }),
                  processed: false
                });
              }
            }
            
            return Promise.resolve({
              items,
              page,
              perPage,
              totalItems: items.length,
              totalPages: Math.ceil(items.length / perPage)
            });
          }),
          update: jest.fn().mockImplementation((id, data) => Promise.resolve({
            id,
            ...data
          })),
          subscribe: jest.fn().mockImplementation((filter, callback) => {
            // Return an unsubscribe function
            return jest.fn();
          })
        };
      })
    };
  });
});

describe('PocketBaseApiClient', () => {
  let client;
  const baseUrl = 'https://example.pockethost.io';
  
  beforeEach(() => {
    // Create a new instance for each test
    client = new PocketBaseApiClient(baseUrl, {
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
  
  it('should set backendType to "pocketbase"', () => {
    expect(client.getBackendType()).toBe(BACKENDS.POCKETBASE);
  });
  
  it('should throw an error if no baseUrl is provided', () => {
    expect(() => new PocketBaseApiClient()).toThrow('PocketBase requires a base URL');
  });
  
  describe('createRoom', () => {
    it('should create a new room in PocketBase', async () => {
      const metadata = { name: 'Test Room' };
      const result = await client.createRoom({ metadata });
      
      // Check that collection method was called correctly
      expect(client.pb.collection).toHaveBeenCalledWith('rooms');
      
      // Check that create was called with correct data
      const createMock = client.pb.collection('rooms').create;
      expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
        metadata: JSON.stringify(metadata)
      }));
      
      // Check the result
      expect(result.success).toBe(true);
      expect(result.roomId).toBe('test-id-123');
    });
    
    it('should handle errors when creating a room', async () => {
      // Mock a failure
      client.pb.collection('rooms').create.mockRejectedValueOnce(new Error('Database error'));
      
      const result = await client.createRoom();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });
  
  describe('joinRoom', () => {
    it('should join an existing room', async () => {
      const result = await client.joinRoom('test-room');
      
      // Check that the right methods were called
      expect(client.pb.collection).toHaveBeenCalledWith('rooms');
      expect(client.pb.collection('rooms').getOne).toHaveBeenCalledWith('test-room');
      expect(client.pb.collection).toHaveBeenCalledWith('participants');
      
      // Check the result
      expect(result.success).toBe(true);
      expect(result.roomId).toBe('test-room');
      expect(result.userId).toBeDefined();
      expect(result.participants).toBeDefined();
    });
    
    it('should return an error for a non-existent room', async () => {
      const result = await client.joinRoom('non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room does not exist');
    });
  });
  
  describe('leaveRoom', () => {
    it('should leave a room successfully', async () => {
      // Setup a mock for a successful participant lookup
      client.pb.collection('participants').getList.mockResolvedValueOnce({
        items: [{ id: 'participant-id', userId: 'test-user', active: true }]
      });
      
      const result = await client.leaveRoom('test-room', 'test-user');
      
      // Check that the right methods were called
      expect(client.pb.collection).toHaveBeenCalledWith('participants');
      expect(client.pb.collection('participants').update).toHaveBeenCalledWith(
        'participant-id',
        expect.objectContaining({ active: false })
      );
      
      // Check the result
      expect(result.success).toBe(true);
    });
    
    it('should handle a user that is not in the room', async () => {
      // Mock empty participants result
      client.pb.collection('participants').getList.mockResolvedValueOnce({
        items: []
      });
      
      const result = await client.leaveRoom('test-room', 'non-existent-user');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found in room');
    });
  });
  
  describe('getRoomStatus', () => {
    it('should get the status of a room', async () => {
      const result = await client.getRoomStatus('test-room');
      
      // Check that the right methods were called
      expect(client.pb.collection).toHaveBeenCalledWith('rooms');
      expect(client.pb.collection('rooms').getOne).toHaveBeenCalledWith('test-room');
      expect(client.pb.collection).toHaveBeenCalledWith('participants');
      
      // Check the result
      expect(result.success).toBe(true);
      expect(result.roomId).toBe('test-room');
      expect(Array.isArray(result.users)).toBe(true);
    });
    
    it('should return an error for a non-existent room', async () => {
      const result = await client.getRoomStatus('non-existent');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room does not exist');
    });
  });
  
  describe('sendSignal', () => {
    it('should send a signal', async () => {
      const signal = { type: 'offer', sdp: 'test-sdp' };
      const result = await client.sendSignal('test-room', 'user-1', 'user-2', signal);
      
      // Check that the right methods were called
      expect(client.pb.collection).toHaveBeenCalledWith('signals');
      expect(client.pb.collection('signals').create).toHaveBeenCalledWith(
        expect.objectContaining({
          room: 'test-room',
          from: 'user-1',
          to: 'user-2',
          signal: JSON.stringify(signal)
        })
      );
      
      // Check the result
      expect(result.success).toBe(true);
    });
  });
  
  describe('getSignals', () => {
    it('should get unprocessed signals for a user', async () => {
      const result = await client.getSignals('test-room', 'user-2');
      
      // Check that the right methods were called
      expect(client.pb.collection).toHaveBeenCalledWith('signals');
      
      // Check the result
      expect(result.success).toBe(true);
      expect(Array.isArray(result.signals)).toBe(true);
    });
  });
  
  describe('_subscribeToSignals and _unsubscribeFromSignals', () => {
    it('should set up and remove signal subscriptions', () => {
      // Set up a subscription
      client._subscribeToSignals('test-room', 'user-1');
      
      // Check that subscribe was called
      expect(client.pb.collection).toHaveBeenCalledWith('signals');
      expect(client.pb.collection('signals').subscribe).toHaveBeenCalledWith(
        expect.stringContaining('room="test-room"'),
        expect.any(Function)
      );
      
      // Check that the subscription was stored
      expect(client._subscriptions.has('test-room:user-1')).toBe(true);
      
      // Remove the subscription
      client._unsubscribeFromSignals('test-room', 'user-1');
      
      // Check that the unsubscribe function was called
      const unsubscribeFn = client._subscriptions.get('test-room:user-1');
      expect(unsubscribeFn).toHaveBeenCalled();
      
      // Check that the subscription was removed
      expect(client._subscriptions.has('test-room:user-1')).toBe(false);
    });
  });
  
  describe('destroy', () => {
    it('should clean up resources', () => {
      // Set up a mock subscription
      const unsubscribeMock = jest.fn();
      client._subscriptions.set('test', unsubscribeMock);
      
      // Call destroy
      client.destroy();
      
      // Check that health check was stopped and subscriptions were cleared
      expect(unsubscribeMock).toHaveBeenCalled();
      expect(client._subscriptions.size).toBe(0);
    });
  });
});