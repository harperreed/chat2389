'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const handleCreateRoom = async () => {
    try {
      setIsCreating(true);
      setErrorMessage('');
      
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to create room');
      }
      
      const data = await response.json();
      router.push(`/room/${data.roomId}`);
    } catch (error) {
      console.error('Error creating room:', error);
      setErrorMessage('Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      setErrorMessage('Please enter a room ID');
      return;
    }
    
    try {
      setErrorMessage('');
      
      // Check if room exists (this will create it if it doesn't)
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to join room');
      }
      
      router.push(`/room/${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      setErrorMessage('Failed to join room. Please try again.');
    }
  };
  
  const handleRoomIdKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleJoinRoom();
    }
  };
  
  return (
    <div className="bg-gray-100 font-sans min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">WebRTC Video Chat</h1>
        
        <div className="bg-white rounded-lg shadow-md p-8 flex flex-col gap-5">
          {errorMessage && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-2 text-sm">
              {errorMessage}
            </div>
          )}
          
          <button 
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-md transition-colors flex items-center justify-center"
            onClick={handleCreateRoom}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Room...
              </>
            ) : (
              'Create New Room'
            )}
          </button>
          
          <div className="my-4 flex items-center text-center text-gray-500 or-separator">OR</div>
          
          <div>
            <input 
              type="text" 
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyDown={handleRoomIdKeyDown}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
              placeholder="Enter Room ID to join"
            />
            <div className="mt-3 flex justify-center">
              <button 
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-md transition-colors"
                onClick={handleJoinRoom}
              >
                Join Room
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Start a video call with anyone by creating a room and sharing the link.</p>
        </div>
      </div>
    </div>
  );
}