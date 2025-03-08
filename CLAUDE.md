# WebRTC Video Chat - Expo App Development Guide

## Build Commands
- `npm start` - Start Expo development server
- `npm run web` - Start Expo for web
- `npm run ios` - Start Expo for iOS
- `npm run android` - Start Expo for Android

## Test Commands
- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage reports
- `npm run test:e2e` - Run end-to-end tests with Playwright

## Code Quality Commands
- `npm run format` - Format all code with Biome
- `npm run lint` - Lint code with Expo's linter
- `npm run lint:fix` - Auto-fix linting issues where possible
- `npm run typecheck` - Run TypeScript type checking

## Code Style Guidelines

### TypeScript/JavaScript
- Use TypeScript for all new files
- Use ES6+ class-based architecture with JSDoc comments
- Follow factory pattern for API clients with interface contracts
- Validate all method inputs before processing
- Use camelCase for variables/methods, PascalCase for classes
- Handle errors using try/catch with standardized response objects
- Prefer async/await over Promise chains
- Import dependencies at the top of each file

### React/React Native
- Use functional components with hooks
- Use the UI Kitten component library for UI elements
- Follow the Expo Router patterns for navigation
- Keep components small and focused on a single responsibility
- Use TypeScript interfaces for component props

### Project Structure
- Main app in `/app` directory with Expo Router structure
- Components in `/app/components` directory
- Services in `/app/services` directory
- API clients in `/app/api` directory
- Tests alongside their components with `.test.tsx` extension