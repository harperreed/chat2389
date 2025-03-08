# WebRTC Video Chat - Expo App Development Guide

## Repository Structure
- Root level: Project configuration and scripts that delegate to the Expo app
- `/app`: The Expo application code

## Build Commands
- `npm start` - Start Expo development server
- `npm run web` - Start Expo for web
- `npm run ios` - Start Expo for iOS
- `npm run android` - Start Expo for Android
- `npm run build:web` - Build Expo web version
- `npm run clean` - Clean build artifacts and node_modules

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
2. Install dependencies: `npm install`
3. Run the appropriate command for your target platform
4. Make changes and test locally
5. Run tests: `npm test`
6. Run linting and type checking: `npm run lint && npm run typecheck`
7. Format code: `npm run format`
8. Commit changes and push to the repository

## Environment Requirements
- Node.js 20+ (a `.nvmrc` file is included for NVM users)
- npm 10+ or yarn
- Expo CLI