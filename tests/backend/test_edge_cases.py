"""
Tests for edge cases and error handling in the API.
"""
import json
import pytest

def test_max_participant_limit(client, reset_active_rooms):
    """Test behavior with a large number of participants."""
    # Create a room
    create_response = client.post('/api/create-room')
    room_data = json.loads(create_response.data)
    room_id = room_data['roomId']
    
    # Join with many users
    user_ids = []
    for i in range(50):  # Test with 50 users
        join_response = client.post(f'/api/join-room/{room_id}')
        join_data = json.loads(join_response.data)
        
        # Verify success
        assert join_response.status_code == 200
        assert join_data['success'] is True
        
        # Store the user ID
        user_ids.append(join_data['userId'])
        
        # Verify participant count
        assert join_data['participants'] == i + 1
    
    # Check room status
    status_response = client.get(f'/api/room-status/{room_id}')
    status_data = json.loads(status_response.data)
    
    assert status_data['participants'] == 50
    assert len(status_data['users']) == 50
    
    # Check that all user IDs are in the room
    for user_id in user_ids:
        assert user_id in status_data['users']

def test_many_signals(client, reset_active_rooms):
    """Test handling a large number of signals."""
    # Create a room with two users
    create_response = client.post('/api/create-room')
    room_data = json.loads(create_response.data)
    room_id = room_data['roomId']
    
    join1_response = client.post(f'/api/join-room/{room_id}')
    join1_data = json.loads(join1_response.data)
    user1_id = join1_data['userId']
    
    join2_response = client.post(f'/api/join-room/{room_id}')
    join2_data = json.loads(join2_response.data)
    user2_id = join2_data['userId']
    
    # Send many signals from User 1 to User 2
    signal_count = 100
    for i in range(signal_count):
        signal_data = {
            'roomId': room_id,
            'userId': user1_id,
            'targetId': user2_id,
            'signal': {
                'type': 'data',
                'content': f'Signal {i}',
                'sequence': i
            }
        }
        
        signal_response = client.post('/api/signal', json=signal_data)
        assert signal_response.status_code == 200
    
    # Get signals for User 2
    get_signals_data = {
        'roomId': room_id,
        'userId': user2_id
    }
    
    get_response = client.post('/api/get-signals', json=get_signals_data)
    get_data = json.loads(get_response.data)
    
    # We should get all signals in the right order
    assert get_data['success'] is True
    assert len(get_data['signals']) == signal_count
    
    # Check signal order is preserved
    for i, signal in enumerate(get_data['signals']):
        assert signal['signal']['sequence'] == i

def test_concurrent_leave(client, reset_active_rooms):
    """Test behavior when multiple users leave at once."""
    # Create a room
    create_response = client.post('/api/create-room')
    room_data = json.loads(create_response.data)
    room_id = room_data['roomId']
    
    # Join with multiple users
    user_ids = []
    for _ in range(5):
        join_response = client.post(f'/api/join-room/{room_id}')
        join_data = json.loads(join_response.data)
        user_ids.append(join_data['userId'])
    
    # All users leave at "the same time"
    for user_id in user_ids:
        leave_data = {
            'roomId': room_id,
            'userId': user_id
        }
        leave_response = client.post('/api/leave-room', json=leave_data)
        assert leave_response.status_code == 200
    
    # Room should no longer exist
    status_response = client.get(f'/api/room-status/{room_id}')
    assert status_response.status_code == 404

def test_invalid_json(client):
    """Test behavior with invalid JSON payloads."""
    # Send invalid JSON to leave-room
    response = client.post('/api/leave-room', 
                          data='invalid json',
                          content_type='application/json')
    
    assert response.status_code == 400
    
    # Send invalid JSON to signal
    response = client.post('/api/signal', 
                          data='invalid json',
                          content_type='application/json')
    
    assert response.status_code == 400
    
    # Send invalid JSON to get-signals
    response = client.post('/api/get-signals', 
                          data='invalid json',
                          content_type='application/json')
    
    assert response.status_code == 400

def test_long_room_id(client):
    """Test behavior with an extremely long room ID."""
    # Create a room normally
    create_response = client.post('/api/create-room')
    room_data = json.loads(create_response.data)
    room_id = room_data['roomId']
    
    # Try to join a room with an extremely long ID
    long_id = 'a' * 1000  # 1000 character room ID
    response = client.post(f'/api/join-room/{long_id}')
    
    # Should 404 but not crash
    assert response.status_code == 404
    
    # Normal room should still be accessible
    status_response = client.get(f'/api/room-status/{room_id}')
    assert status_response.status_code == 200

def test_empty_signals(client, mock_room):
    """Test sending empty signal data."""
    # Set up user IDs
    join_response = client.post(f'/api/join-room/{mock_room}')
    join_data = json.loads(join_response.data)
    user1_id = join_data['userId']
    
    join2_response = client.post(f'/api/join-room/{mock_room}')
    join2_data = json.loads(join2_response.data)
    user2_id = join2_data['userId']
    
    # Send a signal with minimal valid data
    signal_data = {
        'roomId': mock_room,
        'userId': user1_id,
        'targetId': user2_id,
        'signal': {
            'type': 'test'
        }
    }
    
    response = client.post('/api/signal', json=signal_data)
    assert response.status_code == 200
    
    # The recipient should be able to get the minimal signal
    get_data = {
        'roomId': mock_room,
        'userId': user2_id
    }
    
    get_response = client.post('/api/get-signals', json=get_data)
    get_result = json.loads(get_response.data)
    
    assert get_result['success'] is True
    assert len(get_result['signals']) == 1
    assert get_result['signals'][0]['signal']['type'] == 'test'

def test_large_signal_payload(client, mock_room):
    """Test sending a very large signal payload."""
    # Set up user IDs
    join_response = client.post(f'/api/join-room/{mock_room}')
    join_data = json.loads(join_response.data)
    user1_id = join_data['userId']
    
    join2_response = client.post(f'/api/join-room/{mock_room}')
    join2_data = json.loads(join2_response.data)
    user2_id = join2_data['userId']
    
    # Create a large payload (100KB of data)
    large_data = 'x' * 100000
    
    # Send a signal with the large payload
    signal_data = {
        'roomId': mock_room,
        'userId': user1_id,
        'targetId': user2_id,
        'signal': {
            'type': 'large',
            'data': large_data
        }
    }
    
    response = client.post('/api/signal', json=signal_data)
    assert response.status_code == 200
    
    # The recipient should get the large signal intact
    get_data = {
        'roomId': mock_room,
        'userId': user2_id
    }
    
    get_response = client.post('/api/get-signals', json=get_data)
    get_result = json.loads(get_response.data)
    
    assert get_result['success'] is True
    assert len(get_result['signals']) == 1
    assert get_result['signals'][0]['signal']['type'] == 'large'
    assert len(get_result['signals'][0]['signal']['data']) == 100000