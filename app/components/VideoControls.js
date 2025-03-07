'use client';

/**
 * VideoControls component for WebRTC video chat
 */
export default function VideoControls({ 
  isCameraOn, 
  isMicOn, 
  isScreenSharing,
  onToggleCamera, 
  onToggleMic, 
  onToggleScreenShare,
  onCopyRoomLink,
  onLeaveRoom
}) {
  return (
    <div className="flex flex-wrap justify-center gap-2 mt-4">
      <button 
        className={`${isMicOn ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'} text-white px-4 py-2 rounded transition-colors flex items-center gap-2`}
        onClick={onToggleMic}
        title={isMicOn ? "Turn off microphone" : "Turn on microphone"}
      >
        <span className="material-icons text-sm">
          {isMicOn ? 'mic' : 'mic_off'}
        </span>
        {isMicOn ? 'Mute' : 'Unmute'}
      </button>
      
      <button 
        className={`${isCameraOn ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600'} text-white px-4 py-2 rounded transition-colors flex items-center gap-2`}
        onClick={onToggleCamera}
        title={isCameraOn ? "Turn off camera" : "Turn on camera"}
      >
        <span className="material-icons text-sm">
          {isCameraOn ? 'videocam' : 'videocam_off'}
        </span>
        {isCameraOn ? 'Disable Video' : 'Enable Video'}
      </button>
      
      <button 
        className={`${isScreenSharing ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'} px-4 py-2 rounded transition-colors flex items-center gap-2`}
        onClick={onToggleScreenShare}
        title={isScreenSharing ? "Stop screen sharing" : "Share your screen"}
      >
        <span className="material-icons text-sm">
          {isScreenSharing ? 'stop_screen_share' : 'screen_share'}
        </span>
        {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
      </button>
      
      <button 
        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded transition-colors flex items-center gap-2"
        onClick={onCopyRoomLink}
        title="Copy room link to clipboard"
      >
        <span className="material-icons text-sm">content_copy</span>
        Copy Link
      </button>
      
      <button 
        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
        onClick={onLeaveRoom}
        title="Leave the room"
      >
        <span className="material-icons text-sm">exit_to_app</span>
        Leave Room
      </button>
    </div>
  );
}