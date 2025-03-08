# WebRTC Video Chat - Expo App

A modern peer-to-peer video chat application built with Expo, React Native, and UI Kitten.

## Features

- Real-time video/audio communication using WebRTC
- Create and join video chat rooms
- Text chat via WebRTC data channels
- Device selection (camera, microphone, speakers)
- Multiple backend options (Firebase, Mock)
- Responsive design that works on web and mobile
- Toggle self-view (hide/show your own video)
- Mute audio and pause video controls
- Copy room ID to invite others

## Project Structure

This repository uses a monorepo structure:

- Root level: Project configuration and scripts that delegate to the Expo app
- `/app`: The Expo application code

## Getting Started

### Prerequisites

- Node.js 18+ (a `.nvmrc` file is included for NVM users)
- npm or yarn
- Expo CLI

### Installation

1. Clone this repository
2. Install dependencies:

   ```bash
   npm install
   ```

   This will install both the root dependencies and the Expo app dependencies.

### Development

For web development:
```bash
npm run web
```

For iOS:
```bash
npm run ios
```

For Android:
```bash
npm run android
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate test coverage
npm run test:coverage

# Run end-to-end tests
npm run test:e2e
```

### Code Quality

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Cleanup

```bash
npm run clean
```

## App Structure

- `app/app/` - Main screens using Expo Router
  - `index.tsx` - Home screen (create/join room)
  - `room/[id].tsx` - Video chat room screen
- `app/components/` - UI components
  - `VideoContainer.tsx` - Video display component
  - `VideoGrid.tsx` - Grid layout for videos
  - `ChatInterface.tsx` - Chat UI component
  - `MediaControls.tsx` - Controls for audio/video
  - `DeviceSettings.tsx` - Device selection modal
- `app/services/` - Core functionality
  - `webrtc.ts` - WebRTC adapter
  - `media.ts` - Media device management
  - `chat.ts` - Chat data channel
  - `signaling.ts` - Signaling service
- `app/api/` - Backend API clients
  - `ApiInterface.ts` - Common interface
  - `FirebaseApiClient.ts` - Firebase implementation
  - `MockApiClient.ts` - Mock implementation
  - `ApiProvider.ts` - API provider/selector
- `app/theme/` - UI Kitten theme configuration

## Architecture

The application follows a modular architecture:

1. **Services Layer** - Core WebRTC functionality
2. **API Layer** - Backend communication
3. **UI Layer** - User interface components

## Backend Options

The app supports multiple backend options through the `ApiProvider`:

1. **Mock** - In-memory implementation for testing
2. **Firebase** - Uses Firebase Realtime Database

## Notes on WebRTC in Expo

While this implementation works well for web, the WebRTC integration for native platforms (iOS/Android) requires additional configuration:

- For full native support, consider using `react-native-webrtc`
- The current implementation uses WebView for video display on native platforms
- Some features may have limited functionality on native platforms

## Expo Resources

To learn more about developing with Expo:

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [UI Kitten documentation](https://akveo.github.io/react-native-ui-kitten/)