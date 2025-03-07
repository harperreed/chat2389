# WebRTC Video Chat - Development Guide

## Build Commands
- `npm start` - Start dev server with Parcel (frontend only)
- `npm run build` - Build frontend for production
- `npm run clean` - Remove build artifacts
- `python server.py` - Run Python Flask backend
- `docker-compose up --build` - Run with Docker (dev mode)

## Test Commands
- `npm test` - Run all tests (lint, backend, frontend)
- `npm run test:lint` - Run JS and Python linting
- `npm run test:backend` - Run all Python backend tests
- `npm run test:backend:single tests/backend/test_room_api.py::test_create_room` - Run a single backend test
- `npm run test:frontend` - Run all JavaScript frontend tests
- `npm run test:frontend:single "ApiInterface"` - Run a specific frontend test by name
- `npm run test:e2e` - Run end-to-end tests with Playwright
- `npm run test:coverage` - Generate test coverage reports

## Code Quality Commands
- `npm run format` - Format all code (JS with Biome, Python with Ruff)
- `npm run lint:fix` - Auto-fix linting issues where possible

## Code Style Guidelines

### JavaScript
- Use ES6+ class-based architecture with JSDoc comments
- Follow factory pattern for API clients with interface contracts
- Validate all method inputs before processing
- Use camelCase for variables/methods, PascalCase for classes
- Handle errors using try/catch with standardized response objects
- Prefer async/await over Promise chains
- Export dependencies at the top of each file

### Python
- Follow PEP 8 style guidelines
- Use descriptive variable and function names
- Log actions at appropriate levels (debug/info/warning/error)
- Validate all user inputs before processing
- Use clear response structures for API endpoints
- Include docstrings for all functions and classes

### Project Structure
- Frontend in `/src` with modular component organization
- Backend in root directory with Flask
- Keep templates in appropriate directories
- Use data access layer for backend communication