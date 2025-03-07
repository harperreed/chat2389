'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * ChatBox component for WebRTC video chat
 */
export default function ChatBox({ onSendMessage, messages = [] }) {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden flex flex-col bg-white max-w-2xl mx-auto mt-5 shadow-sm h-[300px]">
      <div className="flex-1 overflow-y-auto p-4 chat-messages">
        {messages.map((message, index) => (
          <div key={index} className="clear-both mb-2">
            <div 
              className={`message rounded p-3 max-w-[80%] inline-block ${
                message.sender === 'You' 
                  ? 'message local bg-green-100 float-right rounded-tr-none' 
                  : 'message remote bg-gray-100 float-left rounded-tl-none'
              }`}
            >
              <div className="font-bold text-xs mb-1">
                {message.sender} <span className="text-xs text-gray-500">{message.time}</span>
              </div>
              <div className="break-words">
                {message.text}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} className="clear-both" />
      </div>
      
      <div className="flex border-t border-gray-200 p-2">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type a message..."
        />
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-r transition-colors"
          onClick={handleSendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}