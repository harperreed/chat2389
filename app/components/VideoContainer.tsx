/**
 * Video container component for displaying WebRTC video streams
 */

import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@ui-kitten/components';
import { WebView } from 'react-native-webview';

interface VideoContainerProps {
  stream: MediaStream | null;
  label?: string;
  isLocal?: boolean;
  isScreenShare?: boolean;
}

export const VideoContainer: React.FC<VideoContainerProps> = ({
  stream,
  label = '',
  isLocal = false,
  isScreenShare = false,
}) => {
  const videoRef = useRef<WebView>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      // This is a simplification - the actual implementation would need to handle
      // the MediaStream to WebView communication which is platform-specific.
      // For web, we can use a specialized component that can access the DOM directly.
      
      // On web, the following approach would work with a real HTML video element:
      // if (videoRef.current) {
      //   videoRef.current.srcObject = stream;
      // }
    }
  }, [stream]);

  // For web platform, using a technique to inject the webcam stream
  // In a real implementation, we would use react-native-webrtc or a native module
  // to handle video differently on each platform
  const webviewContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; overflow: hidden; background: #000; }
        video { position: absolute; width: 100%; height: 100%; object-fit: cover; 
          ${isLocal ? 'transform: scaleX(-1);' : ''} }
      </style>
    </head>
    <body>
      <video id="video" autoplay playsinline ${isLocal ? 'muted' : ''}></video>
      <script>
        // In a real implementation, we would need to get the stream from the parent app
        // This is a placeholder to demonstrate the UI
        // In reality, this would receive the MediaStream via a message channel
        
        // For demo purposes only
        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
          .then(stream => {
            document.getElementById('video').srcObject = stream;
          })
          .catch(err => console.error('Error accessing media devices.', err));
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, isScreenShare && styles.screenShare]}>
      <WebView
        ref={videoRef}
        source={{ html: webviewContent }}
        style={styles.video}
        javaScriptEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
      />
      
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label || (isLocal ? 'You' : 'Peer')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    aspectRatio: 16/9,
  },
  screenShare: {
    aspectRatio: 16/10,
  },
  video: {
    flex: 1,
    backgroundColor: '#000',
  },
  labelContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  label: {
    color: 'white',
    fontSize: 12,
  },
});