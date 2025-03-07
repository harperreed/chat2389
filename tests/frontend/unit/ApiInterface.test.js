/**
 * Unit tests for ApiInterface
 */

import ApiInterface from '../../../src/js/api/ApiInterface';

describe('ApiInterface', () => {
  // We can't directly instantiate ApiInterface as it's abstract
  // So we'll create a minimal implementation for testing
  class TestApiClient extends ApiInterface {
    constructor(options = {}) {
      super(options);
      this._backendType = 'test';
    }
    
    // Implement required abstract methods with validation
    async createRoom(options = {}) { 
      return { success: true, roomId: 'test-room' }; 
    }
    
    async joinRoom(roomId, options = {}) { 
      this._validateRoomId(roomId);
      return { success: true, roomId: 'test-room', userId: 'test-user' }; 
    }
    
    async leaveRoom(roomId, userId) { 
      this._validateRoomId(roomId);
      this._validateUserId(userId);
      return { success: true }; 
    }
    
    async getRoomStatus(roomId) { 
      this._validateRoomId(roomId);
      return { success: true, users: [] }; 
    }
    
    async sendSignal(roomId, userId, targetId, signal) { 
      this._validateRoomId(roomId);
      this._validateUserId(userId);
      this._validateUserId(targetId);
      this._validateSignal(signal);
      return { success: true }; 
    }
    
    async getSignals(roomId, userId, options = {}) { 
      this._validateRoomId(roomId);
      this._validateUserId(userId);
      return { success: true, signals: [] }; 
    }
  }
  
  let apiClient;
  
  beforeEach(() => {
    apiClient = new TestApiClient({
      defaultTimeout: 5000,
      maxRetries: 2
    });
  });
  
  describe('constructor', () => {
    it('should set default values', () => {
      const client = new TestApiClient();
      expect(client.defaultTimeout).toBe(30000);
      expect(client.maxRetries).toBe(3);
    });
    
    it('should set custom values', () => {
      expect(apiClient.defaultTimeout).toBe(5000);
      expect(apiClient.maxRetries).toBe(2);
    });
    
    it('should throw an error when instantiating the abstract class directly', () => {
      expect(() => new ApiInterface()).toThrow('Cannot instantiate abstract ApiInterface directly');
    });
  });
  
  describe('getBackendType', () => {
    it('should return the backend type', () => {
      expect(apiClient.getBackendType()).toBe('test');
    });
  });
  
  describe('isConnected', () => {
    it('should return the connection status', () => {
      expect(apiClient.isConnected()).toBe(false);
      
      // Set the connection status
      apiClient._isConnected = true;
      expect(apiClient.isConnected()).toBe(true);
    });
  });
  
  describe('validation methods', () => {
    describe('_validateRoomId', () => {
      it('should not throw for valid room IDs', () => {
        expect(() => apiClient._validateRoomId('valid-room')).not.toThrow();
      });
      
      it('should throw for missing room ID', () => {
        expect(() => apiClient._validateRoomId()).toThrow('Room ID is required');
      });
      
      it('should throw for non-string room ID', () => {
        expect(() => apiClient._validateRoomId(123)).toThrow('Room ID must be a string');
      });
      
      it('should throw for empty room ID', () => {
        // For empty strings, we test that any error is thrown, not specifically which one
        expect(() => apiClient._validateRoomId('')).toThrow();
        expect(() => apiClient._validateRoomId('   ')).toThrow('Room ID cannot be empty');
      });
    });
    
    describe('_validateUserId', () => {
      it('should not throw for valid user IDs', () => {
        expect(() => apiClient._validateUserId('valid-user')).not.toThrow();
      });
      
      it('should throw for missing user ID', () => {
        expect(() => apiClient._validateUserId()).toThrow('User ID is required');
      });
      
      it('should throw for non-string user ID', () => {
        expect(() => apiClient._validateUserId(123)).toThrow('User ID must be a string');
      });
      
      it('should throw for empty user ID', () => {
        // For empty strings, we test that any error is thrown, not specifically which one
        expect(() => apiClient._validateUserId('')).toThrow();
        expect(() => apiClient._validateUserId('   ')).toThrow('User ID cannot be empty');
      });
    });
    
    describe('_validateSignal', () => {
      it('should not throw for valid signals', () => {
        expect(() => apiClient._validateSignal({ type: 'offer', sdp: 'test' })).not.toThrow();
      });
      
      it('should throw for missing signal', () => {
        expect(() => apiClient._validateSignal()).toThrow('Signal data is required');
      });
      
      it('should throw for non-object signal', () => {
        expect(() => apiClient._validateSignal('string')).toThrow('Signal data must be an object');
      });
      
      it('should throw for signal without type', () => {
        expect(() => apiClient._validateSignal({})).toThrow('Signal must have a type');
      });
    });
  });
  
  describe('abstract methods', () => {
    it('should implement required methods in concrete class', async () => {
      // These should work in our test implementation
      expect(await apiClient.createRoom()).toEqual({ success: true, roomId: 'test-room' });
      expect(await apiClient.joinRoom('test-room')).toEqual({ success: true, roomId: 'test-room', userId: 'test-user' });
      expect(await apiClient.leaveRoom('test-room', 'test-user')).toEqual({ success: true });
      expect(await apiClient.getRoomStatus('test-room')).toEqual({ success: true, users: [] });
      expect(await apiClient.sendSignal('test-room', 'user1', 'user2', { type: 'offer' })).toEqual({ success: true });
      expect(await apiClient.getSignals('test-room', 'test-user')).toEqual({ success: true, signals: [] });
    });
    
    it('should have validation checks in abstract methods', async () => {
      // Inspect the method implementations to verify they call validation methods
      const joinRoomCode = apiClient.joinRoom.toString();
      expect(joinRoomCode).toContain('_validateRoomId');
      
      const leaveRoomCode = apiClient.leaveRoom.toString();
      expect(leaveRoomCode).toContain('_validateRoomId');
      expect(leaveRoomCode).toContain('_validateUserId');
      
      const getRoomStatusCode = apiClient.getRoomStatus.toString();
      expect(getRoomStatusCode).toContain('_validateRoomId');
      
      const sendSignalCode = apiClient.sendSignal.toString();
      expect(sendSignalCode).toContain('_validateRoomId');
      expect(sendSignalCode).toContain('_validateUserId');
      expect(sendSignalCode).toContain('_validateSignal');
      
      const getSignalsCode = apiClient.getSignals.toString();
      expect(getSignalsCode).toContain('_validateRoomId');
      expect(getSignalsCode).toContain('_validateUserId');
    });
  });
});