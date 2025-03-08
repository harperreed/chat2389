# WebRTC Video Chat - Expo App Development Guide

## Repository Structure
- Root level: Simple wrapper with scripts that delegate to the Expo app
- `/app`: The main Expo application code (all development should be done here)

## Project Setup
To work with the project:
1. At the root level, use `npm install` to install dependencies
2. Or go to the `/app` directory and run `npm install` there

## Working in the right directory
All development commands should be run from the `/app` directory. You can:
- Use the root level commands, which will delegate to the app directory
- Or `cd app` and then run commands directly

## Build Commands
- `cd app && npm start` - Start Expo development server
- `cd app && npm run web` - Start Expo for web
- `cd app && npm run ios` - Start Expo for iOS
- `cd app && npm run android` - Start Expo for Android
- `cd app && npm run build:web` - Build Expo web version
- `cd app && npm run clean` - Clean build artifacts and node_modules

## Test Commands
- `cd app && npm test` - Run all tests
- `cd app && npm run test:watch` - Run tests in watch mode
- `cd app && npm run test:coverage` - Generate test coverage reports
- `cd app && npm run test:e2e` - Run end-to-end tests with Playwright
- `cd app && npm test -- --testPathIgnorePatterns="/playwright/"` - Run tests but exclude Playwright tests
- `cd app && npm test -- --testPathPattern="/__tests__/api/FirebaseApiClient.test.ts$"` - Run tests for a specific file

### Testing Gotchas
- UI Kitten components need to be properly mocked in `__mocks__/@ui-kitten/components.js`
- For Firebase tests, make sure to mock Timestamp.fromMillis
- For media tests, ensure proper mocking of MediaStream and getSettings() methods
- The Jest config needs to include UI Kitten in the transformIgnorePatterns

## Code Quality Commands
- `cd app && npm run format` - Format all code with Biome
- `cd app && npm run lint` - Lint code with Expo's linter
- `cd app && npm run lint:fix` - Auto-fix linting issues where possible
- `cd app && npm run typecheck` - Run TypeScript type checking

## CI/CD Workflows
- **Expo App Tests** - Runs on every push and PR to test the application
- **Deploy Expo Web App** - Deploys the web version to GitHub Pages when merged to main

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
- Main app in `/app/app` directory with Expo Router structure
- Components in `/app/components` directory
- Services in `/app/services` directory
- API clients in `/app/api` directory
- Tests alongside their components with `.test.tsx` extension
- Assets in `/app/assets` directory

## Development Workflow
1. Pull latest changes from the repository
2. Install dependencies: `cd app && npm install`
3. Run the appropriate command for your target platform
4. Make changes and test locally
5. Run tests: `cd app && npm test`
6. Run linting and type checking: `cd app && npm run lint && npm run typecheck`
7. Format code: `cd app && npm run format`
8. Commit changes and push to the repository

## Environment Requirements
- Node.js 20+ (a `.nvmrc` file is included for NVM users)
- npm 10+ or yarn
- Expo CLI