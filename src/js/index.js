import '../css/index.css';

document.addEventListener('DOMContentLoaded', function() {
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const roomIdInput = document.getElementById('roomIdInput');
    
    // Create a new room
    createRoomBtn.addEventListener('click', async function() {
        console.debug('Creating new room...');
        
        try {
            const response = await fetch('/api/create-room', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                const roomId = data.roomId;
                console.debug(`Room created with ID: ${roomId}`);
                
                // Redirect to the room
                window.location.href = `/room/${roomId}`;
            } else {
                console.error('Failed to create room:', data.error);
                alert('Failed to create room: ' + data.error);
            }
        } catch (error) {
            console.error('Error creating room:', error);
            alert('Error creating room. Please try again.');
        }
    });
    
    // Join an existing room
    joinRoomBtn.addEventListener('click', async function() {
        const roomId = roomIdInput.value.trim();
        
        if (!roomId) {
            alert('Please enter a valid Room ID');
            return;
        }
        
        console.debug(`Joining room: ${roomId}`);
        
        try {
            const response = await fetch(`/api/join-room/${roomId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.debug(`Successfully joined room ${roomId}`);
                
                // Redirect to the room
                window.location.href = `/room/${roomId}`;
            } else {
                console.error('Failed to join room:', data.error);
                alert('Failed to join room: ' + data.error);
            }
        } catch (error) {
            console.error('Error joining room:', error);
            alert('Error joining room. Please check if the Room ID is correct.');
        }
    });
    
    // Allow pressing Enter to join a room
    roomIdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            joinRoomBtn.click();
        }
    });
});