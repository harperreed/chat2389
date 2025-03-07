/**
 * End-to-End tests for room functionality
 * 
 * This test uses Playwright to simulate multiple users joining a room,
 * establishing WebRTC connections, and exchanging chat messages.
 */

// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Room End-to-End Flow', () => {
  let userAContext;
  let userBContext;
  let userAPage;
  let userBPage;
  let roomId;
  
  test.beforeAll(async ({ browser }) => {
    // Create two separate browser contexts (like having two different browsers)
    userAContext = await browser.newContext({
      permissions: ['camera', 'microphone'],
    });
    
    userBContext = await browser.newContext({
      permissions: ['camera', 'microphone'],
    });
    
    // Mock camera and microphone for both contexts
    await userAContext.setPermissions(['camera', 'microphone']);
    await userBContext.setPermissions(['camera', 'microphone']);
    
    // Create pages for each user
    userAPage = await userAContext.newPage();
    userBPage = await userBContext.newPage();
    
    // Mock getUserMedia to avoid actual camera/mic access
    await userAPage.addInitScript(() => {
      const mockStream = new MediaStream();
      window.navigator.mediaDevices.getUserMedia = async () => mockStream;
      window.navigator.mediaDevices.getDisplayMedia = async () => mockStream;
      window.navigator.mediaDevices.enumerateDevices = async () => [
        { kind: 'videoinput', deviceId: 'mock-camera-1', label: 'Mock Camera 1' },
        { kind: 'audioinput', deviceId: 'mock-mic-1', label: 'Mock Microphone 1' },
      ];
    });
    
    await userBPage.addInitScript(() => {
      const mockStream = new MediaStream();
      window.navigator.mediaDevices.getUserMedia = async () => mockStream;
      window.navigator.mediaDevices.getDisplayMedia = async () => mockStream;
      window.navigator.mediaDevices.enumerateDevices = async () => [
        { kind: 'videoinput', deviceId: 'mock-camera-2', label: 'Mock Camera 2' },
        { kind: 'audioinput', deviceId: 'mock-mic-2', label: 'Mock Microphone 2' },
      ];
    });
  });
  
  test.afterAll(async () => {
    // Close all pages and contexts
    await userAPage.close();
    await userBPage.close();
    await userAContext.close();
    await userBContext.close();
  });
  
  test('User A creates a room and User B joins it', async () => {
    // User A creates a room
    await userAPage.goto('http://localhost:5000/');
    
    // Wait for page to load
    await userAPage.waitForSelector('#createRoomButton');
    
    // Click the create room button
    await userAPage.click('#createRoomButton');
    
    // Wait for the room to be created and redirected
    await userAPage.waitForURL(/\/room\/.*/);
    
    // Extract the room ID from the URL
    const url = userAPage.url();
    roomId = url.split('/').pop();
    
    console.log(`Room created with ID: ${roomId}`);
    
    // Wait for User A's local video to appear
    await userAPage.waitForSelector('#localVideo');
    
    // User B joins the room
    await userBPage.goto(`http://localhost:5000/room/${roomId}`);
    
    // Wait for User B's local video to appear
    await userBPage.waitForSelector('#localVideo');
    
    // Wait for User B to be connected to User A
    // This is indicated by a remote video element appearing
    await userBPage.waitForSelector('#remoteVideos video', { timeout: 10000 });
    
    // User A should also see User B
    await userAPage.waitForSelector('#remoteVideos video', { timeout: 10000 });
    
    // Check both users can see the expected number of participants
    const userAParticipants = await userAPage.$$('#remoteVideos video');
    const userBParticipants = await userBPage.$$('#remoteVideos video');
    
    expect(userAParticipants.length).toBe(1);
    expect(userBParticipants.length).toBe(1);
  });
  
  test('Users can exchange text chat messages', async () => {
    // Skip if previous test failed
    if (!roomId) {
      test.skip();
    }
    
    // User A sends a message
    await userAPage.click('#chatButton'); // Open chat if needed
    await userAPage.fill('#chatInput', 'Hello from User A');
    await userAPage.click('#sendChatButton');
    
    // Wait for the message to appear in User B's chat
    await userBPage.waitForSelector('.chat-message:has-text("Hello from User A")');
    
    // User B replies
    await userBPage.fill('#chatInput', 'Hello from User B');
    await userBPage.click('#sendChatButton');
    
    // Wait for the reply to appear in User A's chat
    await userAPage.waitForSelector('.chat-message:has-text("Hello from User B")');
    
    // Check both users can see both messages
    const userAMessages = await userAPage.$$('.chat-message');
    const userBMessages = await userBPage.$$('.chat-message');
    
    expect(userAMessages.length).toBe(2);
    expect(userBMessages.length).toBe(2);
  });
  
  test('Users can toggle media controls', async () => {
    // Skip if previous test failed
    if (!roomId) {
      test.skip();
    }
    
    // Test User A toggling audio
    await userAPage.click('#toggleAudioButton');
    
    // Get the button state after toggle (classes or aria-pressed)
    const audioMuted = await userAPage.$('#toggleAudioButton.muted');
    expect(audioMuted).not.toBeNull();
    
    // Test User B toggling video
    await userBPage.click('#toggleVideoButton');
    
    // Get the button state after toggle
    const videoPaused = await userBPage.$('#toggleVideoButton.paused');
    expect(videoPaused).not.toBeNull();
    
    // Toggle back
    await userAPage.click('#toggleAudioButton');
    await userBPage.click('#toggleVideoButton');
  });
  
  test('Users can leave the room properly', async () => {
    // Skip if previous test failed
    if (!roomId) {
      test.skip();
    }
    
    // User B leaves the room
    await userBPage.click('#leaveRoomButton');
    
    // Check User B is redirected to the home page
    await userBPage.waitForURL('http://localhost:5000/');
    
    // User A should see that User B has left (remote video removed)
    // There might be a delay, so wait a few seconds
    await userAPage.waitForTimeout(2000);
    
    const remainingParticipants = await userAPage.$$('#remoteVideos video');
    expect(remainingParticipants.length).toBe(0);
    
    // Now User A leaves too
    await userAPage.click('#leaveRoomButton');
    
    // Check User A is redirected to the home page
    await userAPage.waitForURL('http://localhost:5000/');
  });
});