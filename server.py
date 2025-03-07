from flask import Flask, render_template, request, jsonify, send_from_directory
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

app = Flask(__name__, static_folder='public', template_folder='public')

# Enable Flask debug logging
app.logger.setLevel(logging.DEBUG)

# Store active connections
active_rooms = {}

@app.route('/')
def index():
    logger.debug("Serving index page")
    return send_from_directory(app.static_folder, 'index.html')

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

@app.route('/api/get-signals', methods=['POST'])
def get_signals():
    """Get pending WebRTC signals for a user."""
    data = request.json
    room_id = data.get('roomId')
    user_id = data.get('userId')
    
    if not all([room_id, user_id]):
        logger.warning("Missing required fields in get-signals request")
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
    
    if room_id not in active_rooms:
        logger.warning(f"Attempt to get signals from non-existent room: {room_id}")
        return jsonify({'success': False, 'error': 'Room does not exist'}), 404
    
    # Get signals for this user
    signals = []
    processed_indices = []
    
    if 'signals' in active_rooms[room_id]:
        # First, find signals for this user
        for index, signal in enumerate(active_rooms[room_id]['signals']):
            # Get signals directed to this user that haven't been processed
            if signal['to'] == user_id and not signal['processed']:
                signals.append({
                    'from': signal['from'],
                    'signal': signal['signal']
                })
                signal['processed'] = True  # Mark as processed
                processed_indices.append(index)
        
        # Clean up old processed signals to prevent memory buildup
        # Only keep the 20 most recent processed signals for history
        active_rooms[room_id]['signals'] = [
            s for i, s in enumerate(active_rooms[room_id]['signals']) 
            if not s['processed'] or i >= len(active_rooms[room_id]['signals']) - 20
        ]
    
    logger.debug(f"Returning {len(signals)} signals for user {user_id} in room {room_id}")
    
    return jsonify({
        'success': True,
        'signals': signals
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
    
    # Store the signal for the target user to retrieve
    # In a real app, this would use WebSockets instead of this polling approach
    if 'signals' not in active_rooms[room_id]:
        active_rooms[room_id]['signals'] = []
    
    # Add the signal to the room's signals list
    active_rooms[room_id]['signals'].append({
        'from': user_id,
        'to': target_id,
        'signal': signal_data,
        'processed': False
    })
    
    logger.debug(f"Stored signal from {user_id} for {target_id} in room {room_id}")
    logger.debug(f"Signal type: {signal_data.get('type')}")
    
    return jsonify({'success': True})

@app.route('/room/<room_id>')
def room(room_id):
    """Serve the room page."""
    if room_id not in active_rooms:
        logger.warning(f"Attempt to access non-existent room: {room_id}")
        return "Room not found", 404
    
    logger.debug(f"Serving room page for room: {room_id}")
    
    # Use Flask's render_template_string to inject the room_id before sending
    from flask import render_template_string
    
    try:
        with open(os.path.join(app.static_folder, 'room.html'), 'r') as f:
            template_content = f.read()
            return render_template_string(template_content, room_id=room_id)
    except Exception as e:
        logger.error(f"Error reading room template: {e}")
        return "Error loading room template", 500

# Health check endpoint
@app.route('/health')
def health_check():
    """Health check endpoint for monitoring."""
    return jsonify({
        'status': 'healthy',
        'active_rooms': len(active_rooms)
    })

# Serve static assets from the public directory
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

if __name__ == '__main__':
    # Use environment variables for host and port if available
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    app.run(host=host, port=port, debug=debug)