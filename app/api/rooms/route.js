import { NextResponse } from 'next/server';

// Simple in-memory storage for active rooms
const activeRooms = new Map();

/**
 * Creates a new room
 * @route POST /api/rooms
 */
export async function POST() {
  try {
    // Generate a random room ID
    const roomId = Math.random().toString(36).substring(2, 8);
    
    // Store room info
    activeRooms.set(roomId, {
      id: roomId,
      createdAt: new Date(),
      participants: 0
    });
    
    return NextResponse.json({ roomId, success: true }, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}

/**
 * Gets all active rooms
 * @route GET /api/rooms
 */
export async function GET() {
  try {
    const rooms = Array.from(activeRooms.values());
    return NextResponse.json({ rooms });
  } catch (error) {
    console.error('Error getting rooms:', error);
    return NextResponse.json({ error: 'Failed to get rooms' }, { status: 500 });
  }
}