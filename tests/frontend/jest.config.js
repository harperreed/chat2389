/**
 * Jest configuration for frontend tests
 */
module.exports = {
  testEnvironment: 'jsdom',
  rootDir: '../../',
  roots: [
    '<rootDir>/src',
    '<rootDir>/tests/frontend'
  ],
  testMatch: [
    '**/tests/frontend/**/*.test.js',
    '**/tests/frontend/**/*.spec.js'
  ],
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    '\\.css$': 'identity-obj-proxy',
  },
  setupFilesAfterEnv: [
    '<rootDir>/tests/frontend/setupTests.js'
  ],
  collectCoverageFrom: [
    'src/js/**/*.js',
    '!src/js/**/index.js',
    '!**/node_modules/**'
  ],
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  verbose: true,
  testTimeout: 10000
};