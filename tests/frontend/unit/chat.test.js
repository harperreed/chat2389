/**
 * Unit tests for the chat module
 */

import '../../../src/js/chat.js';

describe('Chat Module', () => {
  // Mock DOM elements
  let chatContainer;
  let chatMessages;
  let chatInput;
  let sendChatButton;
  let chatButton;
  let chatCounter;
  
  // Mock data
  const mockRoomId = 'test-room-123';
  const mockUserId = 'test-user-456';
  
  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div id="chatContainer" class="hidden">
        <div id="chatMessages"></div>
        <div id="chatInputContainer">
          <input type="text" id="chatInput" placeholder="Type a message...">
          <button id="sendChatButton">Send</button>
        </div>
      </div>
      <button id="chatButton">
        Chat <span id="chatCounter" class="hidden">0</span>
      </button>
    `;
    
    // Get DOM elements
    chatContainer = document.getElementById('chatContainer');
    chatMessages = document.getElementById('chatMessages');
    chatInput = document.getElementById('chatInput');
    sendChatButton = document.getElementById('sendChatButton');
    chatButton = document.getElementById('chatButton');
    chatCounter = document.getElementById('chatCounter');
    
    // Set up global variables
    window.roomId = mockRoomId;
    window.userId = mockUserId;
    
    // Mock sendSignalingMessage function if it doesn't exist
    if (!window.sendSignalingMessage) {
      window.sendSignalingMessage = jest.fn();
    }
    
    // Initialize module if needed
    if (typeof window.initChat === 'function') {
      window.initChat();
    }
    
    // Spy on functions
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });
  
  describe('UI Controls', () => {
    it('should open chat when the chat button is clicked', () => {
      // Initial state should be hidden
      expect(chatContainer.classList.contains('hidden')).toBe(true);
      
      // Click the chat button
      chatButton.click();
      
      // Chat should be visible
      expect(chatContainer.classList.contains('hidden')).toBe(false);
    });
    
    it('should close chat when the button is clicked again', () => {
      // First open the chat
      chatButton.click();
      expect(chatContainer.classList.contains('hidden')).toBe(false);
      
      // Then close it
      chatButton.click();
      expect(chatContainer.classList.contains('hidden')).toBe(true);
    });
    
    it('should reset unread counter when opening chat', () => {
      // Set up some unread messages
      chatCounter.textContent = '5';
      chatCounter.classList.remove('hidden');
      
      // Open chat
      chatButton.click();
      
      // Counter should be reset and hidden
      expect(chatCounter.classList.contains('hidden')).toBe(true);
      expect(chatCounter.textContent).toBe('0');
    });
  });
  
  describe('Sending Messages', () => {
    it('should send a message when the send button is clicked', () => {
      // Type a message
      const testMessage = 'Hello, world!';
      chatInput.value = testMessage;
      
      // Click send button
      sendChatButton.click();
      
      // Check that sendSignalingMessage was called correctly
      expect(window.sendSignalingMessage).toHaveBeenCalledWith(
        'broadcast',
        expect.objectContaining({
          type: 'chat',
          userId: mockUserId,
          message: testMessage
        })
      );
      
      // Input should be cleared
      expect(chatInput.value).toBe('');
    });
    
    it('should not send empty messages', () => {
      // Leave input empty
      chatInput.value = '';
      
      // Click send button
      sendChatButton.click();
      
      // Should not send message
      expect(window.sendSignalingMessage).not.toHaveBeenCalled();
    });
    
    it('should trim whitespace from messages', () => {
      // Message with extra whitespace
      chatInput.value = '   Hello world!   ';
      
      // Click send button
      sendChatButton.click();
      
      // Should send trimmed message
      expect(window.sendSignalingMessage).toHaveBeenCalledWith(
        'broadcast',
        expect.objectContaining({
          message: 'Hello world!'
        })
      );
    });
    
    it('should send a message when Enter key is pressed', () => {
      // Type a message
      chatInput.value = 'Test message';
      
      // Simulate pressing Enter
      const enterEvent = new KeyboardEvent('keydown', { 
        key: 'Enter', 
        code: 'Enter',
        keyCode: 13,
        which: 13
      });
      chatInput.dispatchEvent(enterEvent);
      
      // Check that message was sent
      expect(window.sendSignalingMessage).toHaveBeenCalled();
      expect(chatInput.value).toBe('');
    });
  });
  
  describe('Receiving Messages', () => {
    it('should display received chat messages', () => {
      // Initial state
      expect(chatMessages.children.length).toBe(0);
      
      // Call the handler function directly
      if (typeof window.handleChatMessage === 'function') {
        // Simulate receiving a message
        window.handleChatMessage({
          userId: 'other-user',
          message: 'Hello from other user'
        });
        
        // Check that message was added to the chat
        expect(chatMessages.children.length).toBe(1);
        expect(chatMessages.lastChild.textContent).toContain('Hello from other user');
      }
    });
    
    it('should increment unread counter when chat is closed', () => {
      // Make sure chat is closed
      chatContainer.classList.add('hidden');
      chatCounter.textContent = '0';
      chatCounter.classList.add('hidden');
      
      // Simulate receiving a message
      if (typeof window.handleChatMessage === 'function') {
        window.handleChatMessage({
          userId: 'other-user',
          message: 'New message'
        });
        
        // Counter should increment and become visible
        expect(chatCounter.textContent).toBe('1');
        expect(chatCounter.classList.contains('hidden')).toBe(false);
        
        // Another message
        window.handleChatMessage({
          userId: 'other-user',
          message: 'Another message'
        });
        
        // Counter should increment again
        expect(chatCounter.textContent).toBe('2');
      }
    });
    
    it('should not increase counter for own messages', () => {
      // Make sure chat is closed
      chatContainer.classList.add('hidden');
      chatCounter.textContent = '0';
      chatCounter.classList.add('hidden');
      
      // Simulate receiving own message
      if (typeof window.handleChatMessage === 'function') {
        window.handleChatMessage({
          userId: mockUserId,  // Same as current user
          message: 'My own message'
        });
        
        // Counter should not change
        expect(chatCounter.textContent).toBe('0');
        expect(chatCounter.classList.contains('hidden')).toBe(true);
      }
    });
    
    it('should not increase counter when chat is open', () => {
      // Make sure chat is open
      chatContainer.classList.remove('hidden');
      chatCounter.textContent = '0';
      chatCounter.classList.add('hidden');
      
      // Simulate receiving a message
      if (typeof window.handleChatMessage === 'function') {
        window.handleChatMessage({
          userId: 'other-user',
          message: 'New message while chat open'
        });
        
        // Counter should not change
        expect(chatCounter.textContent).toBe('0');
        expect(chatCounter.classList.contains('hidden')).toBe(true);
      }
    });
  });
  
  describe('Message Formatting', () => {
    it('should escape HTML in messages', () => {
      // Message with HTML
      const htmlMessage = '<script>alert("XSS")</script>';
      
      if (typeof window.handleChatMessage === 'function') {
        // Receive message with HTML
        window.handleChatMessage({
          userId: 'other-user',
          message: htmlMessage
        });
        
        // HTML should be escaped, not interpreted
        const messageElement = chatMessages.lastChild;
        expect(messageElement.innerHTML).not.toContain('<script>');
        expect(messageElement.textContent).toContain(htmlMessage);
      }
    });
    
    it('should add timestamps to messages', () => {
      if (typeof window.handleChatMessage === 'function') {
        // Receive a message
        window.handleChatMessage({
          userId: 'other-user',
          message: 'Test message'
        });
        
        // Check for timestamp
        const messageElement = chatMessages.lastChild;
        expect(messageElement.querySelector('.timestamp')).not.toBeNull();
      }
    });
    
    it('should identify user messages differently from others', () => {
      if (typeof window.handleChatMessage === 'function') {
        // Receive own message
        window.handleChatMessage({
          userId: mockUserId,
          message: 'My message'
        });
        
        // Message should have appropriate class
        const ownMessage = chatMessages.lastChild;
        expect(ownMessage.classList.contains('self')).toBe(true);
        
        // Receive other user's message
        window.handleChatMessage({
          userId: 'other-user',
          message: 'Their message'
        });
        
        // Message should have different class
        const otherMessage = chatMessages.lastChild;
        expect(otherMessage.classList.contains('self')).toBe(false);
      }
    });
  });
});