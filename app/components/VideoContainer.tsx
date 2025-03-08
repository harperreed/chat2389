/**
 * Video container component for displaying WebRTC video streams
 */

import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Text } from '@ui-kitten/components';

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
  // For web, we use a direct HTML video element
  if (Platform.OS === 'web') {
    return (
      <WebVideoContainer
        stream={stream}
        label={label}
        isLocal={isLocal}
        isScreenShare={isScreenShare}
      />
    );
  }

  // For native platforms, we would use a different approach
  // but for this app we're focusing on web
  return (
    <View style={[styles.container, isScreenShare && styles.screenShare]}>
      <View style={styles.placeholderVideo}>
        <Text style={styles.placeholderText}>Video not available on this platform</Text>
      </View>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label || (isLocal ? 'You' : 'Peer')}</Text>
      </View>
    </View>
  );
};

// Web-specific implementation using HTML video element
const WebVideoContainer: React.FC<VideoContainerProps> = ({
  stream,
  label = '',
  isLocal = false,
  isScreenShare = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // When the stream changes, update the video element
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <View style={[styles.container, isScreenShare && styles.screenShare]}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: isLocal ? 'scaleX(-1)' : 'none',
          backgroundColor: '#000',
        }}
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
    aspectRatio: 16 / 9,
  },
  screenShare: {
    aspectRatio: 16 / 10,
  },
  placeholderVideo: {
    flex: 1,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'white',
    textAlign: 'center',
    padding: 20,
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
