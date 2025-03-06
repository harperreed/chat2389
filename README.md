# WebRTC Video Chat

A simple peer-to-peer video chat application using WebRTC, Python, and vanilla JavaScript without any complex libraries.

## Features

- Create and join video chat rooms
- Real-time video and audio communication
- Device selection (camera and microphone)
- Mute audio and pause video controls
- Copy room ID to invite others
- Debug logging for troubleshooting
- Pure WebRTC implementation with no external libraries

## Requirements

- Python 3.7+
- Flask
- Modern web browser with WebRTC support (Chrome, Firefox, Safari, Edge)

## Installation

1. Clone this repository
2. Install the requirements:

```bash
pip install -r requirements.txt
```

## Usage

1. Start the server:

```bash
python server.py
```

2. Open your browser and navigate to `http://localhost:5000`

3. Create a new room or join an existing room by entering its Room ID

4. Share the Room ID with others to invite them to your video chat

5. Allow camera and microphone access when prompted

## Debug Logging

The application includes comprehensive debug logging:

- Server-side logs are printed to the console
- Client-side logs can be viewed in the browser's developer console

## Notes

- This application uses a simplified signaling mechanism
- In a production environment, you would typically:
  - Use WebSockets for real-time signaling
  - Implement user authentication
  - Add additional TURN servers for NAT traversal
  - Enhance security features

## Troubleshooting

- If you can't see or hear other participants:
  - Check that your camera and microphone are working
  - Make sure you've allowed the browser to access your media devices
  - Try a different browser or device
  - Check if your network allows WebRTC traffic
  - Open browser console to see debug messages

## Technical Implementation

- **Server**: Flask web server for serving pages and handling signaling
- **Client**: Pure JavaScript implementation of WebRTC
- **Signaling**: REST API endpoints (in a real app, this would use WebSockets)
- **STUN servers**: Google's public STUN servers for NAT traversal
- **Media Negotiation**: Standard WebRTC offer/answer mechanism