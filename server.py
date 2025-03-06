from flask import Flask, render_template, request, jsonify
import os
import logging
import sys
import json
import uuid

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static')

# Enable Flask debug logging
app.logger.setLevel(logging.DEBUG)

# Store active connections
active_rooms = {}

@app.route('/')
def index():
    logger.debug("Serving index page")
    return render_template('index.html')

@app.route('/api/create-room', methods=['POST'])
def create_room():
    """Create a new room with a unique ID."""
    room_id = str(uuid.uuid4())[:8]  # Use first 8 chars of UUID
    active_rooms[room_id] = {
        'users': []
    }
    logger.debug(f"Created new room: {room_id}")
    return jsonify({'success': True, 'roomId': room_id})

@app.route('/api/join-room/<room_id>', methods=['POST'])
def join_room(room_id):
    """Join an existing room."""
    if room_id not in active_rooms:
        logger.warning(f"Attempt to join non-existent room: {room_id}")
        return jsonify({'success': False, 'error': 'Room does not exist'}), 404
    
    # Generate a user ID for this participant
    user_id = str(uuid.uuid4())[:8]
    
    # Add user to the room
    active_rooms[room_id]['users'].append(user_id)
    
    logger.debug(f"User {user_id} joined room {room_id}")
    logger.debug(f"Room {room_id} now has {len(active_rooms[room_id]['users'])} users")
    
    return jsonify({
        'success': True, 
        'roomId': room_id, 
        'userId': user_id,
        'participants': len(active_rooms[room_id]['users'])
    })

@app.route('/api/leave-room', methods=['POST'])
def leave_room():
    """Leave a room."""
    data = request.json
    room_id = data.get('roomId')
    user_id = data.get('userId')
    
    if not room_id or not user_id:
        logger.warning("Missing roomId or userId in leave-room request")
        return jsonify({'success': False, 'error': 'Missing roomId or userId'}), 400
    
    if room_id not in active_rooms:
        logger.warning(f"Attempt to leave non-existent room: {room_id}")
        return jsonify({'success': False, 'error': 'Room does not exist'}), 404
    
    # Remove user from room
    if user_id in active_rooms[room_id]['users']:
        active_rooms[room_id]['users'].remove(user_id)
        logger.debug(f"User {user_id} left room {room_id}")
        
        # If room is empty, remove it
        if not active_rooms[room_id]['users']:
            del active_rooms[room_id]
            logger.debug(f"Room {room_id} is now empty and has been removed")
    
    return jsonify({'success': True})

@app.route('/api/room-status/<room_id>', methods=['GET'])
def room_status(room_id):
    """Get the status of a room including active users."""
    logger.debug(f"Getting status for room: {room_id}")
    
    if room_id not in active_rooms:
        logger.warning(f"Attempt to get status of non-existent room: {room_id}")
        return jsonify({'success': False, 'error': 'Room does not exist'}), 404
    
    # Return the room information
    return jsonify({
        'success': True,
        'roomId': room_id,
        'participants': len(active_rooms[room_id]['users']),
        'users': active_rooms[room_id]['users']
    })

@app.route('/api/signal', methods=['POST'])
def signal():
    """Exchange WebRTC signaling data."""
    data = request.json
    room_id = data.get('roomId')
    user_id = data.get('userId')
    target_id = data.get('targetId')
    signal_data = data.get('signal')
    
    if not all([room_id, user_id, signal_data]):
        logger.warning("Missing required fields in signal request")
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
    
    if room_id not in active_rooms:
        logger.warning(f"Attempt to signal in non-existent room: {room_id}")
        return jsonify({'success': False, 'error': 'Room does not exist'}), 404
    
    # Here you would typically forward the signal to the target user
    # In a real application, this would use WebSockets for real-time communication
    logger.debug(f"Received signal from {user_id} for {target_id if target_id else 'all users'} in room {room_id}")
    logger.debug(f"Signal data: {json.dumps(signal_data)[:100]}...")  # Log first 100 chars of signal data
    
    # This is a simplified implementation that just acknowledges the signal
    # In a real app, you would forward this signal to the target peer
    return jsonify({'success': True})

@app.route('/room/<room_id>')
def room(room_id):
    """Serve the room page."""
    if room_id not in active_rooms:
        logger.warning(f"Attempt to access non-existent room: {room_id}")
        return "Room not found", 404
    
    logger.debug(f"Serving room page for room: {room_id}")
    return render_template('room.html', room_id=room_id)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)