"""
Tests for the room-related API endpoints.
"""
import json
import pytest
from flask import url_for

def test_create_room(client):
    """Test creating a room."""
    response = client.post('/api/create-room')
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 200
    assert data['success'] is True
    assert 'roomId' in data
    assert len(data['roomId']) == 8  # UUID first 8 chars

def test_join_room(client, reset_active_rooms):
    """Test joining a room."""
    # First create a room
    create_response = client.post('/api/create-room')
    create_data = json.loads(create_response.data)
    room_id = create_data['roomId']
    
    # Now join the room
    join_response = client.post(f'/api/join-room/{room_id}')
    join_data = json.loads(join_response.data)
    
    # Verify the response structure
    assert join_response.status_code == 200
    assert join_data['success'] is True
    assert join_data['roomId'] == room_id
    assert 'userId' in join_data
    assert join_data['participants'] == 1

def test_join_nonexistent_room(client, reset_active_rooms):
    """Test joining a room that doesn't exist."""
    response = client.post('/api/join-room/nonexistent-room')
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 404
    assert data['success'] is False
    assert 'error' in data
    assert data['error'] == 'Room does not exist'

def test_room_status(client, mock_room):
    """Test getting room status."""
    response = client.get(f'/api/room-status/{mock_room}')
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 200
    assert data['success'] is True
    assert data['roomId'] == mock_room
    assert data['participants'] == 2
    assert 'users' in data
    assert len(data['users']) == 2
    assert 'test-user-1' in data['users']
    assert 'test-user-2' in data['users']

def test_nonexistent_room_status(client):
    """Test getting status of a room that doesn't exist."""
    response = client.get('/api/room-status/nonexistent-room')
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 404
    assert data['success'] is False
    assert 'error' in data
    assert data['error'] == 'Room does not exist'

def test_leave_room(client, mock_room):
    """Test leaving a room."""
    response = client.post('/api/leave-room', 
                          json={'roomId': mock_room, 'userId': 'test-user-1'})
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 200
    assert data['success'] is True
    
    # Verify the user was removed from the room
    from server import active_rooms
    assert 'test-user-1' not in active_rooms[mock_room]['users']
    assert len(active_rooms[mock_room]['users']) == 1

def test_leave_room_last_user(client, mock_room):
    """Test leaving a room as the last user should remove the room."""
    # First user leaves
    client.post('/api/leave-room', 
              json={'roomId': mock_room, 'userId': 'test-user-1'})
    
    # Second user leaves
    response = client.post('/api/leave-room', 
                         json={'roomId': mock_room, 'userId': 'test-user-2'})
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 200
    assert data['success'] is True
    
    # Verify the room was removed
    from server import active_rooms
    assert mock_room not in active_rooms

def test_leave_nonexistent_room(client):
    """Test leaving a room that doesn't exist."""
    response = client.post('/api/leave-room', 
                         json={'roomId': 'nonexistent-room', 'userId': 'test-user'})
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 404
    assert data['success'] is False
    assert 'error' in data
    assert data['error'] == 'Room does not exist'