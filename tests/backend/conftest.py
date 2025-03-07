"""
Pytest configuration for backend tests.
Contains fixtures and setup/teardown for testing the Flask application.
"""
import pytest
import os
import sys
import logging
from flask import Flask

# Add the project root to the system path to allow importing modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Import the actual application
import server

@pytest.fixture
def app():
    """Create and configure a Flask app for testing."""
    # Configure the app for testing
    app = Flask(__name__)
    app.config.update({
        "TESTING": True,
    })
    
    # Register the routes from the actual application
    # This allows testing the routes without starting the actual server
    app.register_blueprint(server.app)
    
    yield app

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def runner(app):
    """A test CLI runner for the app."""
    return app.test_cli_runner()

@pytest.fixture
def reset_active_rooms():
    """Reset the active_rooms dictionary between tests."""
    server.active_rooms = {}
    yield
    server.active_rooms = {}

@pytest.fixture
def mock_room():
    """Create a mock room for testing."""
    room_id = "test-room-id"
    server.active_rooms[room_id] = {
        "users": ["test-user-1", "test-user-2"],
        "signals": []
    }
    yield room_id
    # Clean up
    if room_id in server.active_rooms:
        del server.active_rooms[room_id]

@pytest.fixture
def mock_room_with_signals():
    """Create a mock room with signals for testing."""
    room_id = "test-room-id"
    server.active_rooms[room_id] = {
        "users": ["test-user-1", "test-user-2"],
        "signals": [
            {
                "from": "test-user-1",
                "to": "test-user-2",
                "signal": {"type": "offer", "sdp": "test-sdp"},
                "processed": False
            }
        ]
    }
    yield room_id
    # Clean up
    if room_id in server.active_rooms:
        del server.active_rooms[room_id]