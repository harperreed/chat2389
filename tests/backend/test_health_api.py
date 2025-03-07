"""
Tests for the health check API endpoint.
"""
import json
import pytest

def test_health_check_empty(client, reset_active_rooms):
    """Test health check endpoint with no active rooms."""
    response = client.get('/health')
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 200
    assert 'status' in data
    assert data['status'] == 'healthy'
    assert 'active_rooms' in data
    assert data['active_rooms'] == 0

def test_health_check_with_rooms(client, reset_active_rooms):
    """Test health check endpoint with active rooms."""
    # Create a few rooms first
    for i in range(3):
        client.post('/api/create-room')
    
    # Now check the health endpoint
    response = client.get('/health')
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 200
    assert 'status' in data
    assert data['status'] == 'healthy'
    assert 'active_rooms' in data
    assert data['active_rooms'] == 3

def test_health_check_after_room_removal(client, reset_active_rooms):
    """Test health check after rooms are created and removed."""
    # Create some rooms
    create_responses = []
    for i in range(3):
        create_responses.append(json.loads(client.post('/api/create-room').data))
    
    # Join each room
    for resp in create_responses:
        room_id = resp['roomId']
        client.post(f'/api/join-room/{room_id}')
    
    # Leave one room completely
    first_room = create_responses[0]['roomId']
    client.post('/api/leave-room', json={
        'roomId': first_room,
        'userId': json.loads(client.post(f'/api/join-room/{first_room}').data)['userId']
    })
    
    # Now check the health endpoint
    response = client.get('/health')
    data = json.loads(response.data)
    
    # Verify the response structure
    assert response.status_code == 200
    assert data['status'] == 'healthy'
    # We should have 2 rooms now (created 3, but emptied 1 which gets removed)
    assert data['active_rooms'] == 2