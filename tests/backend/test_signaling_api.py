"""
Tests for the WebRTC signaling API endpoints.
"""
import json
import pytest

def test_send_signal(client, mock_room):
    """Test sending a signal to another user."""
    signal_data = {
        'roomId': mock_room,
        'userId': 'test-user-1',
        'targetId': 'test-user-2',
        'signal': {
            'type': 'offer',
            'sdp': 'test-sdp-data'
        }
    }
    
    response = client.post('/api/signal', json=signal_data)
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 200
    assert data['success'] is True
    
    # Verify the signal was stored in the room
    from server import active_rooms
    assert 'signals' in active_rooms[mock_room]
    assert len(active_rooms[mock_room]['signals']) == 1
    assert active_rooms[mock_room]['signals'][0]['from'] == 'test-user-1'
    assert active_rooms[mock_room]['signals'][0]['to'] == 'test-user-2'
    assert active_rooms[mock_room]['signals'][0]['signal']['type'] == 'offer'
    assert active_rooms[mock_room]['signals'][0]['processed'] is False

def test_send_signal_missing_fields(client, mock_room):
    """Test sending a signal with missing required fields."""
    # Missing userId
    signal_data = {
        'roomId': mock_room,
        'targetId': 'test-user-2',
        'signal': {
            'type': 'offer',
            'sdp': 'test-sdp-data'
        }
    }
    
    response = client.post('/api/signal', json=signal_data)
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 400
    assert data['success'] is False
    assert 'error' in data
    assert 'Missing required fields' in data['error']

def test_send_signal_nonexistent_room(client):
    """Test sending a signal to a nonexistent room."""
    signal_data = {
        'roomId': 'nonexistent-room',
        'userId': 'test-user-1',
        'targetId': 'test-user-2',
        'signal': {
            'type': 'offer',
            'sdp': 'test-sdp-data'
        }
    }
    
    response = client.post('/api/signal', json=signal_data)
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 404
    assert data['success'] is False
    assert 'error' in data
    assert data['error'] == 'Room does not exist'

def test_get_signals_no_signals(client, mock_room):
    """Test getting signals when there are none."""
    get_data = {
        'roomId': mock_room,
        'userId': 'test-user-1'
    }
    
    response = client.post('/api/get-signals', json=get_data)
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 200
    assert data['success'] is True
    assert 'signals' in data
    assert len(data['signals']) == 0

def test_get_signals(client, mock_room_with_signals):
    """Test getting signals for a user."""
    get_data = {
        'roomId': mock_room_with_signals,
        'userId': 'test-user-2'
    }
    
    response = client.post('/api/get-signals', json=get_data)
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 200
    assert data['success'] is True
    assert 'signals' in data
    assert len(data['signals']) == 1
    assert data['signals'][0]['from'] == 'test-user-1'
    assert data['signals'][0]['signal']['type'] == 'offer'
    
    # Verify signal was marked as processed
    from server import active_rooms
    assert active_rooms[mock_room_with_signals]['signals'][0]['processed'] is True

def test_get_signals_missing_fields(client):
    """Test getting signals with missing required fields."""
    get_data = {
        'roomId': 'test-room'
        # Missing userId
    }
    
    response = client.post('/api/get-signals', json=get_data)
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 400
    assert data['success'] is False
    assert 'error' in data
    assert 'Missing required fields' in data['error']

def test_get_signals_nonexistent_room(client):
    """Test getting signals from a nonexistent room."""
    get_data = {
        'roomId': 'nonexistent-room',
        'userId': 'test-user-1'
    }
    
    response = client.post('/api/get-signals', json=get_data)
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 404
    assert data['success'] is False
    assert 'error' in data
    assert data['error'] == 'Room does not exist'

def test_signal_cleanup(client, mock_room):
    """Test that processed signals are cleaned up."""
    # Add multiple signals to the room
    for i in range(25):  # More than the cleanup threshold of 20
        signal_data = {
            'roomId': mock_room,
            'userId': 'test-user-1',
            'targetId': 'test-user-2',
            'signal': {
                'type': f'offer-{i}',
                'sdp': f'test-sdp-data-{i}'
            }
        }
        client.post('/api/signal', json=signal_data)
    
    # Get signals to mark them as processed
    get_data = {
        'roomId': mock_room,
        'userId': 'test-user-2'
    }
    client.post('/api/get-signals', json=get_data)
    
    # Verify only 20 signals are kept after cleanup
    from server import active_rooms
    assert len(active_rooms[mock_room]['signals']) <= 20
    
    # Verify all remaining signals are marked as processed
    for signal in active_rooms[mock_room]['signals']:
        assert signal['processed'] is True