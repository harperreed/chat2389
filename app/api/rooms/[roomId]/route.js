import { NextResponse } from 'next/server';

// Simple in-memory storage for active rooms (shared with the main rooms route)
const activeRooms = new Map();

/**
 * Gets information about a specific room
 * @route GET /api/rooms/[roomId]
 */
export async function GET(request, { params }) {
  try {
    const { roomId } = params;
    
    // Check if room exists
    if (!activeRooms.has(roomId)) {
      // If room doesn't exist, create it
      activeRooms.set(roomId, {
        id: roomId,
        createdAt: new Date(),
        participants: 0
      });
    }
    
    const room = activeRooms.get(roomId);
    return NextResponse.json({ room });
  } catch (error) {
    console.error('Error getting room:', error);
    return NextResponse.json({ error: 'Failed to get room information' }, { status: 500 });
  }
}

/**
 * Updates information about a specific room
 * @route PATCH /api/rooms/[roomId]
 */
export async function PATCH(request, { params }) {
  try {
    const { roomId } = params;
    const data = await request.json();
    
    // Check if room exists
    if (!activeRooms.has(roomId)) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    
    // Update room information
    const room = activeRooms.get(roomId);
    const updatedRoom = { ...room, ...data };
    activeRooms.set(roomId, updatedRoom);
    
    return NextResponse.json({ room: updatedRoom });
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}

/**
 * Deletes a specific room
 * @route DELETE /api/rooms/[roomId]
 */
export async function DELETE(request, { params }) {
  try {
    const { roomId } = params;
    
    // Check if room exists
    if (!activeRooms.has(roomId)) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    
    // Delete room
    activeRooms.delete(roomId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting room:', error);
    return NextResponse.json({ error: 'Failed to delete room' }, { status: 500 });
  }
}